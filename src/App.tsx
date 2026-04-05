import {ReactRunner} from "@chub-ai/stages-ts";
import {Stage} from "./Stage";
import {TestStageRunner} from "./TestRunner";

function App() {
    const isDev = import.meta.env.MODE === 'development';
    console.info(`Running in ${import.meta.env.MODE}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stageFactory = (data: any) => {
        return new Stage(data);
    };
    return isDev ? <TestStageRunner factory={stageFactory}/> : <ReactRunner factory={stageFactory} />;
}

export default App;