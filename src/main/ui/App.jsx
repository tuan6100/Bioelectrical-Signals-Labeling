import {HashRouter} from 'react-router-dom'
import AppRoutes from "./routes/index.jsx";
import {Provider} from "react-redux";
import {store} from "./redux/store.js"


function App() {
    return (
        <Provider store={store}>
            <HashRouter>
                <AppRoutes />
            </HashRouter>
        </Provider>
    )
}

export default App