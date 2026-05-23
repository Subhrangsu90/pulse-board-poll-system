import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "./router";
import "./index.css";
import { applyAppearance } from "./utils/theme";
import { getWorkspacePreferences } from "./utils/workspacePreferences";

const cachedPreferences = getWorkspacePreferences();
applyAppearance({
	themeMode: cachedPreferences.themeMode,
	textScale: cachedPreferences.textScale,
});

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: false,
			staleTime: 5000, // 5 seconds default cache age
		},
	},
});

ReactDOM.createRoot(document.getElementById("root")!).render(
	<QueryClientProvider client={queryClient}>
		<RouterProvider router={router} />
	</QueryClientProvider>,
);
