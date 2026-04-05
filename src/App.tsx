import {ReactRunner} from "@chub-ai/stages-ts";
import {Stage} from "./Stage";
import {TestStageRunner} from "./TestRunner";

function App() {
    const isDev = import.meta.env.MODE === 'development';
    console.info(`Running in ${import.meta.env.MODE}`);
    const stageFactory = (data: any) => {
        return new Stage(data);
    };
    return isDev ? <TestStageRunner factory={stageFactory}/> : <ReactRunner factory={stageFactory} />;
}

export default App;