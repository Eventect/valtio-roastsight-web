import virtualDriver from "../drivers/virtual_driver";

export const driverInstance = virtualDriver({ existingParams: null });
await driverInstance.connect();
