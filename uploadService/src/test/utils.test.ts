//

import { describe, expect, test } from "bun:test";
import {
  getBuildScript,
  getOutputDirectory,
  getProjectDirectory,
  getSiteUrl,
  getStaticFramework,
  isDeploymentHost,
  normalizeRepositoryUrl,
  validateRepositoryUrl,
} from "../utils";

describe("deployment input validation", () => {
  test("accepts only public HTTPS GitHub repository URLs", () => {
    expect(validateRepositoryUrl("https://github.com/acme/site")).toBe(true);
    expect(validateRepositoryUrl("https://github.com/acme/site.git/")).toBe(
      true,
    );
    expect(validateRepositoryUrl("http://github.com/acme/site")).toBe(false);
    expect(validateRepositoryUrl("https://example.com/acme/site")).toBe(false);
    expect(
      validateRepositoryUrl(
        "https://github.com/acme/site?redirect=https://example.com",
      ),
    ).toBe(false);
    expect(validateRepositoryUrl("file:///tmp/site")).toBe(false);
    expect(normalizeRepositoryUrl("https://github.com/Acme/Site.git/")).toBe(
      "https://github.com/acme/site",
    );
  });

  test("accepts only safe output directory and build script values", () => {
    expect(getOutputDirectory("vite")).toBe("dist");
    expect(getOutputDirectory("next_static")).toBe("out");
    expect(getOutputDirectory("vite", "apps/site/dist")).toBe("apps/site/dist");
    expect(getOutputDirectory("vite", "../outside")).toBeNull();
    expect(getOutputDirectory("vite", "/tmp/out")).toBeNull();
    expect(getOutputDirectory("vite", ".")).toBeNull();
    expect(getStaticFramework(undefined)).toBe("vite");
    expect(getStaticFramework("next_static")).toBe("next_static");
    expect(getStaticFramework("next_server")).toBeNull();
    expect(getBuildScript("build")).toBe("build");
    expect(getBuildScript("build && curl example.com")).toBeNull();
  });

  test("accepts project directories anywhere inside the repository", () => {
    expect(getProjectDirectory()).toBe(".");
    expect(getProjectDirectory(".")).toBe(".");
    expect(getProjectDirectory("client")).toBe("client");
    expect(getProjectDirectory("apps/customer-site/")).toBe("apps/customer-site");
    expect(getProjectDirectory("../outside")).toBeNull();
    expect(getProjectDirectory("apps/../outside")).toBeNull();
    expect(getProjectDirectory("/tmp/site")).toBeNull();
    expect(getProjectDirectory("apps\\site")).toBe("apps/site");
  });

  test("builds predictable static subdomain URLs and rejects reserved hosts", () => {
    expect(
      getSiteUrl("abc123", {
        SITE_DOMAIN: "sites.example.com",
        PUBLIC_SITE_PROTOCOL: "https",
      }),
    ).toBe("https://abc123.sites.example.com");
    expect(
      getSiteUrl("abc123", { SITE_DOMAIN: "localhost", SITE_PORT: "3001" }),
    ).toBe("http://abc123.localhost:3001");
    expect(
      isDeploymentHost("abc123.sites.example.com", "sites.example.com"),
    ).toBe(true);
    expect(isDeploymentHost("api.sites.example.com", "sites.example.com")).toBe(
      false,
    );
    expect(
      isDeploymentHost("nested.abc.sites.example.com", "sites.example.com"),
    ).toBe(false);
  });
});
