import EmgChart from "./components/EmgChart";
import {createRoot} from "react-dom/client";

function App() {
    return (
        <EmgChart/>
    )
}

createRoot(document.getElementById('root')).render(
    <App />
)