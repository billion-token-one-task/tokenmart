import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { useAuthToken, useSelectedAgentId } from "./use-auth";

function StorageBackedProbe() {
  const token = useAuthToken();
  const { selectedAgentId } = useSelectedAgentId();

  return (
    <div data-token={token ?? "none"} data-agent={selectedAgentId ?? "none"} />
  );
}

function installStorage(values: Record<string, string>) {
  const storage = {
    getItem(key: string) {
      return values[key] ?? null;
    },
    setItem() {},
    removeItem() {},
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener() {},
      removeEventListener() {},
    },
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
}

function clearBrowserGlobals() {
  Reflect.deleteProperty(globalThis, "window");
  Reflect.deleteProperty(globalThis, "localStorage");
}

test("auth hooks keep the first render stable before effects run", () => {
  clearBrowserGlobals();
  const serverHtml = renderToStaticMarkup(<StorageBackedProbe />);

  installStorage({
    tokenmart_token: "live-token",
    selected_agent_id: "agent-42",
  });
  const browserHtml = renderToStaticMarkup(<StorageBackedProbe />);

  assert.equal(serverHtml, browserHtml);
  assert.match(serverHtml, /data-token="none"/);
  assert.match(serverHtml, /data-agent="none"/);

  clearBrowserGlobals();
});
