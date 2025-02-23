import { Logger } from '../../../../cli/Logger';
import GlobalOptions from '../../../../GlobalOptions';
import request from '../../../../request';
import { validation } from '../../../../utils/validation';
import GraphCommand from '../../../base/GraphCommand';
import commands from '../../commands';

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  groupId?: string;
  mailNickname?: string;
}

class AadO365GroupTeamifyCommand extends GraphCommand {
  public get name(): string {
    return commands.O365GROUP_TEAMIFY;
  }

  public get description(): string {
    return 'Creates a new Microsoft Teams team under existing Microsoft 365 group';
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
        groupId: typeof args.options.groupId !== 'undefined',
        mailNickname: typeof args.options.mailNickname !== 'undefined'
      });
    });
  }

  #initOptions(): void {
    this.options.unshift(
      {
        option: '-i, --groupId [groupId]'
      },
      {
        option: '--mailNickname [mailNickname]'
      }
    );
  }

  #initValidators(): void {
    this.validators.push(
      async (args: CommandArgs) => {
        if (args.options.groupId && !validation.isValidGuid(args.options.groupId)) {
          return `${args.options.groupId} is not a valid GUID`;
        }

        return true;
      }
    );
  }

  #initOptionSets(): void {
    this.optionSets.push(['groupId', 'mailNickname']);
  }

  private getGroupId(args: CommandArgs): Promise<string> {
    if (args.options.groupId) {
      return Promise.resolve(args.options.groupId);
    }

    const requestOptions: any = {
      url: `${this.resource}/v1.0/groups?$filter=mailNickname eq '${encodeURIComponent(args.options.mailNickname as string)}'`,
      headers: {
        accept: 'application/json;odata.metadata=none'
      },
      responseType: 'json'
    };

    return request
      .get<{ value: [{ id: string }] }>(requestOptions)
      .then(response => {
        const groupItem: { id: string } | undefined = response.value[0];

        if (!groupItem) {
          return Promise.reject(`The specified Microsoft 365 Group does not exist`);
        }

        if (response.value.length > 1) {
          return Promise.reject(`Multiple Microsoft 365 Groups with name ${args.options.mailNickname} found: ${response.value.map(x => x.id)}`);
        }

        return Promise.resolve(groupItem.id);
      });
  }

  public async commandAction(logger: Logger, args: CommandArgs): Promise<void> {
    try {
      const data: any = {
        "memberSettings": {
          "allowCreatePrivateChannels": true,
          "allowCreateUpdateChannels": true
        },
        "messagingSettings": {
          "allowUserEditMessages": true,
          "allowUserDeleteMessages": true
        },
        "funSettings": {
          "allowGiphy": true,
          "giphyContentRating": "strict"
        }
      };

      const groupId = await this.getGroupId(args);
      const requestOptions: any = {
        url: `${this.resource}/v1.0/groups/${encodeURIComponent(groupId)}/team`,
        headers: {
          accept: 'application/json;odata.metadata=none'
        },
        data: data,
        responseType: 'json'
      };

      await request.put(requestOptions);
    }
    catch (err: any) {
      this.handleRejectedODataJsonPromise(err);
    }
  }
}

module.exports = new AadO365GroupTeamifyCommand();