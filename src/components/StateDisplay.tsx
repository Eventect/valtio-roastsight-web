import { useSnapshot } from "valtio";
import { driverInstance } from "../store";

export default function StateDisplay() {
  const state = useSnapshot(driverInstance.state);
  return (
    <div className="border rounded m-1 p-2 ">
      <pre className="text-xs">{JSON.stringify(state, null, 2)}</pre>
    </div>
  );
}
