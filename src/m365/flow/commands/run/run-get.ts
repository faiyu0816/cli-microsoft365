import { Logger } from '../../../../cli/Logger';
import GlobalOptions from '../../../../GlobalOptions';
import request from '../../../../request';
import AzmgmtCommand from '../../../base/AzmgmtCommand';
import commands from '../../commands';

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  environment: string;
  flow: string;
  name: string;
}

class FlowRunGetCommand extends AzmgmtCommand {
  public get name(): string {
    return commands.RUN_GET;
  }

  public get description(): string {
    return 'Gets information about a specific run of the specified Microsoft Flow';
  }

  public defaultProperties(): string[] | undefined {
    return ['name', 'startTime', 'endTime', 'status', 'triggerName'];
  }

  constructor() {
    super();
  
    this.#initOptions();
  }
  
  #initOptions(): void {
    this.options.unshift(
      {
        option: '-n, --name <name>'
      },
      {
        option: '-f, --flow <flow>'
      },
      {
        option: '-e, --environment <environment>'
      }
    );
  }

  public async commandAction(logger: Logger, args: CommandArgs): Promise<void> {
    if (this.verbose) {
      logger.logToStderr(`Retrieving information about run ${args.options.name} of Microsoft Flow ${args.options.flow}...`);
    }

    const requestOptions: any = {
      url: `${this.resource}providers/Microsoft.ProcessSimple/environments/${encodeURIComponent(args.options.environment)}/flows/${encodeURIComponent(args.options.flow)}/runs/${encodeURIComponent(args.options.name)}?api-version=2016-11-01`,
      headers: {
        accept: 'application/json'
      },
      responseType: 'json'
    };

    try {
      const res = await request.get<any>(requestOptions);

      res.startTime = res.properties.startTime;
      res.endTime = res.properties.endTime || '';
      res.status = res.properties.status;
      res.triggerName = res.properties.trigger.name;
      logger.log(res);
    }
    catch (err: any) {
      this.handleRejectedODataJsonPromise(err);
    }
  }
}

module.exports = new FlowRunGetCommand();