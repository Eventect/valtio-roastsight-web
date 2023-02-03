import { ICommandKey, IParams, IState } from "../driver_types";



export function shouldRetryCommand(
  commandKey: ICommandKey,
  state: IState,
  params: IParams
) {
  // Should retry the command if:
  // 1. measure.byId[commandKey].targetChangeReuqest
  // 2. Math.abs(measure.byId[commandKey].value - measure.byId[commandKey].TargetValue) >= Math.abs(measure.byId[commandKey].previousValue - measure.byId[commandKey].TargetValue)
  // 3. driverParams.commandRetryLimited && state.commands[commandKey].retriesCounter <= driverParams.maxNumberOfRetries || !driverParams.commandRetryLimited

  const requestedTargetChange = state.commands.byId[commandKey].issuingCommand;

  const currentDistance =
    state.measures.byId[commandKey].value -
    state.measures.byId[commandKey].targetValue!;

  const previousDistance =
    state.measures.byId[commandKey].previousValue! -
    state.measures.byId[commandKey].targetValue!;

  const progressionNotObserved =
    Math.abs(currentDistance) >= Math.abs(previousDistance) ? true : false;

  const canRetryCommand =
    (params.commandRetryLimited.value &&
      state.commands.byId[commandKey].retriesCounter <=
        params.maxNumberOfRetries.value) ||
    !params.commandRetryLimited.value;

  console.log({
    requestedTargetChange,
    progressionNotObserved,
    canRetryCommand,
    currentDistance,
    previousDistance,
  });

  return requestedTargetChange && progressionNotObserved && canRetryCommand;
}
