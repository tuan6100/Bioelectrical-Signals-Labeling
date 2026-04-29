import {HashRouter} from 'react-router-dom'
import AppRoutes from "./routes/index.jsx";



function App() {
    return (
        <HashRouter>
            <AppRoutes />
        </HashRouter>
    )
}

export default App