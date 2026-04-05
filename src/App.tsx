import {ReactRunner} from "@chub-ai/stages-ts";
import {Stage} from "./Stage";
import {TestStageRunner} from "./TestRunner";

function App() {
  const isDev = import.meta.env.MODE === 'development';
  console.info(`Running in ${import.meta.env.MODE}`);

  return isDev ? <TestStageRunner factory={(data) => new Stage(data)}/> :
      <ReactRunner factory={(data) => new Stage(data)} />;
}

export default App