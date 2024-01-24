// remove the config persisted --
// extract validating into this service
// add parameter for extend testing
// add a second parameter that's "internal version" number maintained by us

import {spawnSync} from "child_process";
import {BaseService, ServiceConfig, ServiceResponse} from "./base-service.js";

export default class ChartValidatorService extends BaseService {

  constructor(config: ServiceConfig) {
    super(config);
  }

  async run(): Promise<ServiceResponse<any>> {
    const capabilities = await this.findCapabilities();
    const hooks = await this.findHooks();
    const dependencies = await this.findDependencies();

    let response: ServiceResponse<string>;

    if (capabilities.success && hooks.success && dependencies.success) {
      response = {
        success: true,
        body: "Addon pre-validation complete"
      }
    } else if (!capabilities.success) {
      response = {
        success: false,
        body: "Addon pre-validation failed",
        error: {
          // check if there's already something in response.error.input
          // append to it or create it.

        }
      }
    }

    return Promise.resolve(response);
  }

  private async findCapabilities(): Promise<ServiceResponse<string>> {
    const capabilities = spawnSync('grep', ['-Rile', '".Capabilities"', this.config.chart], {
      shell: true,
      encoding: "utf-8"
    });

    let response: ServiceResponse<string>;

    if (capabilities.stdout === "") {
      response = {
        success: true,
      }
    } else {
      response = {
        success: false,
        body: "Unsupported system Capabilities are used in chart.",
        error: {
          input: capabilities.stdout,
          options: {
            code: "E501",
            exit: 1
          }
        }
      }
    }

    return Promise.resolve(response);
  }

  private async findHooks(): Promise<ServiceResponse<string>> {
    const hooks = spawnSync('grep', ['-Rile', '".Hooks"', this.config.chart], {shell: true, encoding: "utf-8"});

    let response: ServiceResponse<string>;
    if (hooks.stdout === "") {
      response = {
        success: true,
      }
    } else {
      response = {
        success: false,
        body: "Unsupported system Hooks are used in chart.",
        error: {
          input: hooks.stdout,
          options: {
            code: "E502",
            exit: 1
          }
        }
      }
    }

    return Promise.resolve(response);
  }

  private async findDependencies(): Promise<ServiceResponse<string>> {
    const grepDependencies = spawnSync('helm', ['dependency', 'list', this.config.chart], {
      shell: true,
      encoding: "utf-8"
    });

    // split every line in the output
    // discard headers
    // in every subsequent line, get the output at index 1 (which is the relative path of a dependency)
    const dependencies = grepDependencies.stdout.toString()
      .split('/n')
      .slice(1)
      .map(line => line.split('/t')[1]);

    let response: ServiceResponse<string>;

    // check dependencies to ensure they all contain file://
    const allDepsFiles = dependencies.every(dep => dep.includes('file://'));

    if (allDepsFiles) {
      response = {
        success: true,
      }
    } else {
      response = {
        success: false,
        body: "Not all dependencies reside in the main chart.",
        error: {
          input: dependencies.toString(),
          options: {
            code: "E503",
            exit: 1
          }
        }
      }
    }

    return Promise.resolve(response);
  }
}
