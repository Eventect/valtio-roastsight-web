interface IParam {
  nameForCustomer: string;
  noteForCustomer?: string;
  value?: any;
}

export interface IParams {
  connectionRejectionPercentage: IParam;
  disconnectionOnUpdatePercentage: IParam;
  samplingFrequency: IParam;
  maxReconnectionAttempts: IParam;
  commandRetryLimited: IParam;
  maxNumberOfRetries: IParam;
  retryFrequency: IParam;
}

export interface IMeasure {
  value: number;
  type: string;
  hasTarget: boolean;
  targetValue?: number;
  previousValue?: number;
}

export interface ICommand {
  linkedMeasure: string;
  command: Function;
  min: number;
  max: number;
  issuingCommand: boolean;
  lastCommand: {
    verb: string | null;
    target: number | null;
  };
  frequencyCycleCounter: number;
  retriesCounter: number;
  supportedVerbs: string[];
}

export type ICommandKey = "burnerLevel";

export interface IState {
  measures: {
    byId: { [key: string]: IMeasure };
    byName: string[];
  };
  commands: {
    byId: { [key: string]: ICommand };
    byName: ICommandKey[];
  };
  connected: boolean;
  failedConnections: number;
}
