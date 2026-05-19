import { createRoute, createRouter } from "@tanstack/react-router";

import { rootRoute } from "./routes/__root";
import { AppLayout } from "./components/layout/AppLayout";
import CreatePoll from "./pages/createPoll";
import Dashboard from "./pages/Dashboard";
import Drafts from "./pages/drafts";
import Landing from "./pages/landing";
import MyPolls from "./pages/myPolls";
import Profile from "./pages/profile";
import PublicPoll from "./pages/publicPoll";
import Results from "./pages/results";
import Settings from "./pages/settings";

const workspaceRoute = createRoute({
	getParentRoute: () => rootRoute,
	id: "workspace",
	component: AppLayout,
});

const dashboardRoute = createRoute({
	getParentRoute: () => workspaceRoute,
	path: "/dashboard",
	component: Dashboard,
});

const resultsRoute = createRoute({
	getParentRoute: () => workspaceRoute,
	path: "/results",
	component: Results,
});

const pollsRoute = createRoute({
	getParentRoute: () => workspaceRoute,
	path: "/polls",
	component: MyPolls,
});

const draftsRoute = createRoute({
	getParentRoute: () => workspaceRoute,
	path: "/drafts",
	component: Drafts,
});

const settingsRoute = createRoute({
	getParentRoute: () => workspaceRoute,
	path: "/settings",
	component: Settings,
});

const createPollRoute = createRoute({
	getParentRoute: () => workspaceRoute,
	path: "/create",
	component: CreatePoll,
});

const editPollRoute = createRoute({
	getParentRoute: () => workspaceRoute,
	path: "/polls/$pollId/edit",
	component: CreatePoll,
});

const profileRoute = createRoute({
	getParentRoute: () => workspaceRoute,
	path: "/profile",
	component: Profile,
});

const landingRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: Landing,
});

const publicPollRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/public/poll/$slug",
	component: PublicPoll,
});

const routeTree = rootRoute.addChildren([
	workspaceRoute.addChildren([
		dashboardRoute,
		resultsRoute,
		pollsRoute,
		draftsRoute,
		settingsRoute,
		createPollRoute,
		editPollRoute,
		profileRoute,
	]),
	landingRoute,
	publicPollRoute,
]);

export const router = createRouter({
	routeTree,
});
