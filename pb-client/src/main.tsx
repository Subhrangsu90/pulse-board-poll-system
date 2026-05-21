import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import "./index.css";
import { applyAppearance } from "./utils/theme";
import { getWorkspacePreferences } from "./utils/workspacePreferences";

const cachedPreferences = getWorkspacePreferences();
applyAppearance({
	themeMode: cachedPreferences.themeMode,
	textScale: cachedPreferences.textScale,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
	<RouterProvider router={router} />,
);
