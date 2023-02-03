import { proxy } from "valtio";
import { getRandomArbitrary } from "../../utils/math";
import { shouldRetryCommand } from "../common/abstractDriver";
import { ICommandKey, IParams, IState } from "../driver_types";

// -----------------------------------------------------------------------------
// DEFINITIONS:
// - user: the final user (soul) of the application
// - client: the app using the driver
// - closure or driver: the function declared in this file
// -----------------------------------------------------------------------------

/**
 * A roaster driver for testing purposes only.
 * It encapsulated a Promise that simulate a physical device state with
 * random disconnections and errors.
 *
 * It also simulates two control commands:
 *  - *burnerLevel*, that simulates a step motor command, such as those used on the
 *    Probat Probatone Series II with siemens modbus controller;
 *  - *airflowLevel*, that simulates an instantaneusly changing command, such as
 *    those used on several roasters through frequency variators.
 *
 * This driver is also meant to be an interface template for any real drivers.
 */
export default function virtualDriver({
  existingParams = null,
}: {
  existingParams?: IParams | null;
}) {
  /**
   * Driver state proxy
   */

  const initialState: IState = {
    measures: {
      byId: {
        beanTemperature: {
          value: 0,
          type: "temperature",
          hasTarget: false,
        },
        airTemperature: {
          value: 0,
          type: "temperature",
          hasTarget: false,
        },
        burnerLevel: {
          value: 0,
          type: "percentage",
          hasTarget: true, // true if the indicator refers to a command output
          targetValue: 0, // The desired output as set by the command. The value may align to the targetValue istantly or with a delay
          previousValue: 0, // Tracks the value on the previous tick, used to check if the value is moving towards the TargetValue
        },
      },
      byName: ["beanTemperature", "airTemperature", "burnerLevel"],
    },
    commands: {
      byId: {
        burnerLevel: {
          linkedMeasure: "burnerLevel",
          command: changeBurnerLevel,
          min: 0,
          max: 100,
          issuingCommand: false,
          lastCommand: {
            verb: null,
            target: null,
          },
          frequencyCycleCounter: 0,
          retriesCounter: 0,
          supportedVerbs: ["set_to", "take_control", "increase", "decrease"],
        },
      },
      byName: ["burnerLevel"],
    },
    connected: false,
    failedConnections: 0,
  };

  const state = proxy(initialState);

  // -----------------------------------------------------------------------------
  // DEFAULT CONFIGURATION
  //
  // This is a read-only configuration with the purpose to feed the client.
  // It can be modified by the client, but the modified state is hold by the client.
  // -----------------------------------------------------------------------------

  /**
   * Configuration proxy
   */
  const config = proxy({
    defaultDisplays: {
      byName: {
        beanTemperature: {
          attachedTo: "beanTemperature",
          unit: "°C",
          divider: 1,
          humanName: "Bean Temperature",
        },
        airTemperature: {
          attachedTo: "airTemperature",
          unit: "°C",
          divider: 1,
          humanName: "Air Temperature",
        },
        burnerLevel: {
          attachedTo: "burnerLevel",
          divider: 1,
          unit: "%",
          humanName: "Burner Level",
        },
      },
      byId: ["beanTemperature", "airTemperature", "burnerLevel"],
    },
  });

  // -----------------------------------------------------------------------------
  // DRIVER PARAMS
  //
  // The params used by the driver.
  // They are initialized to the default params
  // -----------------------------------------------------------------------------

  const defaultParams = {
    connectionRejectionPercentage: {
      nameForCustomer: "Rejection Frequency (%)",
      value: 50,
    },
    disconnectionOnUpdatePercentage: {
      nameForCustomer: "Disconnection Frequency on Update (%)",
      value: 1,
    },
    samplingFrequency: {
      nameForCustomer: "Sampling Frequency (ms)",
      value: 1000,
    },
    maxReconnectionAttempts: {
      nameForCustomer: "Maximum reconnection attemps (#)",
      noteForCustomer: "If zero, keep retrying indefinitely",
      value: 0,
    },
    commandRetryLimited: {
      nameForCustomer: "Limit the number of command retrys",
      value: true,
    },
    maxNumberOfRetries: {
      nameForCustomer: "Number of retries",
      noteForCustomer:
        "Applied only if 'Limit the number of command retrys' is checked",
      value: 10,
    },
    retryFrequency: {
      nameForCustomer: "Retry frequency (in sampling cycles)",
      noteForCustomer:
        "If 1, retries every sampling cycle, if 2 retries every two sampling cycles, etc",
      value: 1,
    },
  };

  const initializationParams = existingParams || defaultParams;

  const params = proxy(initializationParams);

  const about = {
    name: "Virtual Driver",
    version: "0.0.2",
    released: "2023.01.19",
    copyright: "(C) Paolo Tessarolo",
    description:
      "A virtual driver untied to physical devices, for demo or testing purposes only.",
    availableCommands: state.commands.byName,
  };

  async function connect() {
    console.log(`🔌 connecting... (${state.failedConnections + 1} attempt)`);
    try {
      await createConnection({
        rejectionPercentage: params.connectionRejectionPercentage.value / 100.0,
      });
      state.failedConnections = 0;
      state.connected = true;
      await startUpdateCycle(params.samplingFrequency.value);
      console.log("⚡️ successfully connected.");
    } catch (e) {
      console.log("💀 Failed to connect.");
      state.failedConnections++;
      state.connected = false;
      if (
        params.maxReconnectionAttempts.value === 0 ||
        params.maxReconnectionAttempts.value > state.failedConnections
      ) {
        setTimeout(async () => await connect(), 1000);
      }
    }
  }

  let updateCycleId: number | undefined;

  function disconnect() {
    state.connected = false;
    clearInterval(updateCycleId);
  }

  async function command(control: ICommandKey, verb: string, target: number) {
    console.log(`Issuing command: ${control} -> ${verb} -> ${target}...`);

    // Setup
    state.commands.byId[control].issuingCommand = true;
    state.commands.byId[control].lastCommand.verb = verb;
    state.commands.byId[control].lastCommand.target = target;
    state.measures.byId[control].previousValue =
      state.measures.byId[control].value;
    state.measures.byId[control].targetValue = target;

    await state.commands.byId[control].command(verb, target);
  }

  async function changeBurnerLevel(verb: string, target: number) {
    switch (verb) {
      case "set_to":
        // This should change the burner level target, not the actual burner level
        console.log("Changing burining level target...");
        await changeBurnerLevelTo(target);
        break;
      case "increase":
        // setTimeout(() => console.log('Control taken'), 2000);
        await changeBurnerLevelTo(
          state.measures.byId["burnerLevel"].value + target
        );
        break;
      default:
        console.log("Not implemented: burner Control", verb, target);
        break;
    }
  }

  async function changeBurnerLevelTo(target: number) {
    state.measures.byId["burnerLevel"].targetValue = target;
  }

  // This should be implemented as a Modbus write holding register in the real world
  async function moveBurnerLevel() {
    const endLevel = state.measures.byId["burnerLevel"].targetValue!;
    const currentLevel = state.measures.byId["burnerLevel"].value!;
    console.log(`Changing burner level to ${endLevel}`);
    // let current = state.measures.burnerLevel.value;
    const endLevelVariance = 0.95;

    let increment = currentLevel < endLevel ? 0.5 : -0.5;
    while (
      (increment > 0 &&
        state.measures.byId["burnerLevel"].value <
          endLevel * endLevelVariance) ||
      (increment < 0 &&
        state.measures.byId["burnerLevel"].value > endLevel * endLevelVariance)
    ) {
      state.measures.byId["burnerLevel"].value += increment;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // -----------------------------------------------------------------------------
  // INTERFACE
  // -----------------------------------------------------------------------------

  // -----------------------------------------------------------------------------
  // Call An initial connection
  // -----------------------------------------------------------------------------
  return {
    connect, // called to connect or reconnect the driver
    disconnect, // called to programmatically stop the update cycle
    command, // Generic command interface: command("burnerLevel", "set_to", 100), command("burner", "take_control")
    params,
    about, // returns the about object
    state, // app and user cannot modify this!
    config,
  };

  async function checkCommand(commandKey: ICommandKey) {
    if (shouldRetryCommand(commandKey, state, params)) {
      await retryCommand(commandKey);
    }
    if (
      Math.abs(
        state.measures.byId[commandKey].value -
          state.measures.byId[commandKey].targetValue!
      ) <=
        0.01 * state.measures.byId[commandKey].value &&
      state.commands.byId[commandKey].issuingCommand
    ) {
      console.log("stop command...");
      state.commands.byId[commandKey].issuingCommand = false;
    }
  }

  // PRIVATE --------------------------------------------------
  // Driver internals
  //-----------------------------------------------------------
  async function createConnection({
    rejectionPercentage,
  }: {
    rejectionPercentage: number;
  }) {
    return new Promise(async (resolve, reject) => {
      const randomNumber = Math.random();
      if (randomNumber < rejectionPercentage) {
        reject(new Error("Random rejection"));
      } else {
        console.log("Succeded to create connection...");
        // state.connected = true;
        resolve("Success");
      }
    });
  }

  //-----------------------------------------------------------
  // UPDATE CYCLE
  //-----------------------------------------------------------
  async function startUpdateCycle(frequency: number) {
    updateCycleId = setInterval(() => {
      // Update the measures
      console.log("📏 Updating measures...");
      state.measures.byName.map(async (key) => {
        if (!state.measures.byId[key].hasTarget) {
          state.measures.byId[key].value = getNewMeasure();
          console.log(`Updated ${key}: ${state.measures.byId[key].value}`);
        }
      });
      // Checks if the target is equal to the actual
      state.commands.byName.map(async (key) => {
        await checkCommand(key);
        state.measures.byId[key].previousValue = state.measures.byId[key].value;
      });
    }, frequency);
  }

  async function retryCommand(commandKey: ICommandKey) {
    await state.commands.byId[commandKey].command();
    state.commands.byId[commandKey].retriesCounter++;
    state.measures.byId[commandKey].previousValue =
      state.measures.byId[commandKey].value;
  }

  function getNewMeasure() {
    return getRandomArbitrary(0, 1000);
  }
}
