// app.jsx
import { useNavigate, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import { Button, ButtonGroup } from "@shopify/polaris";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  console.log("App loader called");
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();
  const navigate = useNavigate();
  console.log("App rendering with apiKey:", apiKey ? "present" : "missing");

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <div style={{ padding: '1rem' }}>
        <ButtonGroup>
          <Button onClick={() => navigate("/app")}>Home</Button>
          <Button onClick={() => navigate("/app/pokemon")}>Pokemon TCG</Button>
          <Button onClick={() => navigate("/app/mtg")} disabled>Magic: The Gathering</Button>
          <Button onClick={() => navigate("/app/igdb")} disabled>Video Games</Button>
          <Button onClick={() => navigate("/app/setup")}>Setup</Button>
        </ButtonGroup>
      </div>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error("App error:", error);
  return boundary.error(error);
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};