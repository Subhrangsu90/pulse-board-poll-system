import { createRootRoute, Outlet } from "@tanstack/react-router";
import { ToastProvider } from "../components/Toast";

export const rootRoute = createRootRoute({
	component: () => (
		<ToastProvider>
			<Outlet />
		</ToastProvider>
	),
});
