import StateDisplay from "./components/StateDisplay";
import { driverInstance } from "./store/index";

function App() {
  const handleIncrementByTen = () => {
    driverInstance.command("burnerLevel", "increase", 10);
  };
  return (
    <div className="flex">
      <StateDisplay />
      <div className="m-1 mx-5 p-2 rounded border w-full">
        <button
          onClick={handleIncrementByTen}
          className="bg-indigo-600 text-white rounded border border-indigo-800 px-3 py-1"
        >
          + 10
        </button>
        <button className="bg-indigo-600 text-white rounded border border-indigo-800 px-3 py-1 mx-3">
          - 10
        </button>
      </div>
    </div>
  );
}

export default App;
