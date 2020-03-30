import { anyString, anything, spy, verify, resetCalls } from "ts-mockito";

import { setupFixture } from "backfill-utils-test";
import { getCacheStorageProvider } from "backfill-cache";
import { Hasher } from "backfill-hasher";
import { createConfig } from "backfill-config";
import { logger } from "backfill-logger";

import { backfill } from "../index";
import { createBuildCommand } from "../commandRunner";

describe("backfill", () => {
  it("with cache miss and then cache hit", async () => {
    //  Set up
    await setupFixture("basic");

    const config = createConfig(process.cwd());
    const {
      cacheStorageConfig,
      clearOutput,
      internalCacheFolder,
      outputGlob,
      packageRoot
    } = config;

    // Arrange
    const cacheStorage = getCacheStorageProvider(
      cacheStorageConfig,
      internalCacheFolder,
      logger,
      process.cwd()
    );
    const buildCommandRaw = "npm run compile";
    const buildCommand = createBuildCommand(
      [buildCommandRaw],
      clearOutput,
      outputGlob
    );
    const hasher = new Hasher(
      { packageRoot, outputGlob, logger },
      buildCommandRaw
    );

    // Spy
    const spiedCacheStorage = spy(cacheStorage);
    const spiedBuildCommand = jest.fn(buildCommand);
    const spiedHasher = spy(hasher);

    // Execute
    await backfill(config, cacheStorage, spiedBuildCommand, hasher);

    // Assert
    verify(spiedHasher.createPackageHash()).once();
    expect(spiedBuildCommand).toHaveBeenCalled();
    verify(spiedCacheStorage.fetch(anyString())).once();
    verify(spiedCacheStorage.put(anyString(), anything())).once();

    resetCalls(spiedHasher);
    resetCalls(spiedCacheStorage);
    jest.clearAllMocks();

    // Execute
    await backfill(config, cacheStorage, buildCommand, hasher);

    // Assert
    verify(spiedHasher.createPackageHash()).once();
    expect(spiedBuildCommand).not.toHaveBeenCalled();
    verify(spiedCacheStorage.fetch(anyString())).once();
    verify(spiedCacheStorage.put(anyString(), anyString())).never();
  });
});
