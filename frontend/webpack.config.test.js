const originalEnv = process.env;

function loadConfig() {
  jest.resetModules();
  return require("./webpack.config.js");
}

describe("webpack dev server port", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.AGENT_DYNAMIC_PORT;
    delete process.env.PORT;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("uses port 8080 for normal local development", () => {
    expect(loadConfig().devServer.port).toBe(8080);
  });

  it("honors an explicit PORT override", () => {
    process.env.PORT = "5173";

    expect(loadConfig().devServer.port).toBe(5173);
  });

  it("uses an OS-assigned free port for agent worktree sessions", () => {
    process.env.AGENT_DYNAMIC_PORT = "1";

    expect(loadConfig().devServer.port).toBe(0);
  });

  it("uses an OS-assigned free port for agents even when PORT is set", () => {
    process.env.AGENT_DYNAMIC_PORT = "1";
    process.env.PORT = "8081";

    expect(loadConfig().devServer.port).toBe(0);
  });

  it("defines an agent start script that opts into automatic port selection", () => {
    const packageJson = require("./package.json");

    expect(packageJson.scripts["start:agent"]).toBe(
      "AGENT_DYNAMIC_PORT=1 webpack serve --config webpack.config.js --mode development"
    );
  });
});
