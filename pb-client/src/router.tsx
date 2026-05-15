import { createRoute, createRouter } from "@tanstack/react-router";

import { rootRoute } from "./routes/__root";
import Dashboard from "./pages/dashboard";
import Landing from "./pages/landing";

const homeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard",
	component: Dashboard,
});

const aboutRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: Landing,
});

const routeTree = rootRoute.addChildren([homeRoute, aboutRoute]);

export const router = createRouter({
	routeTree,
});
