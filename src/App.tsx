import {ReactRunner} from "@chub-ai/stages-ts";
import {Stage} from "./Stage";
import {TestStageRunner} from "./TestRunner";

function App() {
    const isDev = import.meta.env.MODE === 'development';
    console.info(`Running in ${import.meta.env.MODE}`);
    const stageFactory = (_data: any) => {
        return new Stage({});
    };
    return isDev ? <TestStageRunner factory={stageFactory}/> : <ReactRunner factory={stageFactory as any} />;
}

export default App;