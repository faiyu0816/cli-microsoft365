import { Group } from '@microsoft/microsoft-graph-types';
import { Logger } from '../../../../cli/Logger';
import GlobalOptions from '../../../../GlobalOptions';
import request from '../../../../request';
import { validation } from '../../../../utils/validation';
import { aadGroup } from '../../../../utils/aadGroup';
import GraphCommand from '../../../base/GraphCommand';
import { Channel } from '../../Channel';
import commands from '../../commands';
import { Tab } from '../../Tab';

interface ExtendedGroup extends Group {
  resourceProvisioningOptions: string[];
}

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  teamId?: string;
  teamName?: string;
  channelId?: string;
  channelName?: string;
  tabId?: string;
  tabName?: string;
}

interface ExtendedGroup extends Group {
  resourceProvisioningOptions: string[];
}

class TeamsTabGetCommand extends GraphCommand {
  private teamId: string = "";
  private channelId: string = "";

  public get name(): string {
    return commands.TAB_GET;
  }

  public get description(): string {
    return 'Gets information about the specified Microsoft Teams tab';
  }

  constructor() {
    super();

    this.#initTelemetry();
    this.#initOptions();
    this.#initValidators();
    this.#initOptionSets();
  }

  #initTelemetry(): void {
    this.telemetry.push((args: CommandArgs) => {
      Object.assign(this.telemetryProperties, {
        teamId: typeof args.options.teamId !== 'undefined',
        teamName: typeof args.options.teamName !== 'undefined',
        channelId: typeof args.options.channelId !== 'undefined',
        channelName: typeof args.options.channelName !== 'undefined',
        tabId: typeof args.options.tabId !== 'undefined',
        tabName: typeof args.options.tabName !== 'undefined'
      });
    });
  }

  #initOptions(): void {
    this.options.unshift(
      {
        option: '--teamId [teamId]'
      },
      {
        option: '--teamName [teamName]'
      },
      {
        option: '--channelId [channelId]'
      },
      {
        option: '--channelName [channelName]'
      },
      {
        option: '-i, --tabId [tabId]'
      },
      {
        option: '-n, --tabName [tabName]'
      }
    );
  }

  #initValidators(): void {
    this.validators.push(
      async (args: CommandArgs) => {
        if (args.options.teamId && !validation.isValidGuid(args.options.teamId as string)) {
          return `${args.options.teamId} is not a valid GUID`;
        }

        if (args.options.channelId && !validation.isValidTeamsChannelId(args.options.channelId as string)) {
          return `${args.options.channelId} is not a valid Teams ChannelId`;
        }

        if (args.options.tabId && !validation.isValidGuid(args.options.tabId as string)) {
          return `${args.options.tabId} is not a valid GUID`;
        }

        return true;
      }
    );
  }

  #initOptionSets(): void {
    this.optionSets.push(
      ['teamId', 'teamName'],
      ['channelId', 'channelName'],
      ['tabId', 'tabName']
    );
  }

  private getTeamId(args: CommandArgs): Promise<string> {
    if (args.options.teamId) {
      return Promise.resolve(args.options.teamId);
    }

    return aadGroup
      .getGroupByDisplayName(args.options.teamName!)
      .then(group => {
        if ((group as ExtendedGroup).resourceProvisioningOptions.indexOf('Team') === -1) {
          return Promise.reject(`The specified team does not exist in the Microsoft Teams`);
        }

        return group.id!;
      });
  }

  private getChannelId(args: CommandArgs): Promise<string> {
    if (args.options.channelId) {
      return Promise.resolve(args.options.channelId);
    }

    const channelRequestOptions: any = {
      url: `${this.resource}/v1.0/teams/${encodeURIComponent(this.teamId)}/channels?$filter=displayName eq '${encodeURIComponent(args.options.channelName as string)}'`,
      headers: {
        accept: 'application/json;odata.metadata=none'
      },
      responseType: 'json'
    };

    return request
      .get<{ value: Channel[] }>(channelRequestOptions)
      .then(response => {
        const channelItem: Channel | undefined = response.value[0];

        if (!channelItem) {
          return Promise.reject(`The specified channel does not exist in the Microsoft Teams team`);
        }

        return Promise.resolve(channelItem.id);
      });
  }

  private getTabId(args: CommandArgs): Promise<string> {
    if (args.options.tabId) {
      return Promise.resolve(args.options.tabId);
    }

    const tabRequestOptions: any = {
      url: `${this.resource}/v1.0/teams/${encodeURIComponent(this.teamId)}/channels/${encodeURIComponent(this.channelId)}/tabs?$filter=displayName eq '${encodeURIComponent(args.options.tabName as string)}'`,
      headers: {
        accept: 'application/json;odata.metadata=none'
      },
      responseType: 'json'
    };

    return request
      .get<{ value: Tab[] }>(tabRequestOptions)
      .then(response => {
        const tabItem: Tab | undefined = response.value[0];

        if (!tabItem) {
          return Promise.reject(`The specified tab does not exist in the Microsoft Teams team channel`);
        }

        return Promise.resolve(tabItem.id);
      });
  }

  public async commandAction(logger: Logger, args: CommandArgs): Promise<void> {
    try {
      this.teamId = await this.getTeamId(args);
      this.channelId = await this.getChannelId(args);
      const tabId: string = await this.getTabId(args);
      const endpoint: string = `${this.resource}/v1.0/teams/${encodeURIComponent(this.teamId)}/channels/${encodeURIComponent(this.channelId)}/tabs/${encodeURIComponent(tabId)}`;

      const requestOptions: any = {
        url: endpoint,
        headers: {
          accept: 'application/json;odata.metadata=none'
        },
        responseType: 'json'
      };

      const res: Tab = await request.get<Tab>(requestOptions);
      logger.log(res);
    } 
    catch (err: any) {
      this.handleRejectedODataJsonPromise(err);
    }
  }
}

module.exports = new TeamsTabGetCommand();