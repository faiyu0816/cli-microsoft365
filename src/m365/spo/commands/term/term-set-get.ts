import { Logger } from '../../../../cli/Logger';
import config from '../../../../config';
import GlobalOptions from '../../../../GlobalOptions';
import request from '../../../../request';
import { formatting } from '../../../../utils/formatting';
import { ClientSvcResponse, ClientSvcResponseContents, ContextInfo, spo } from '../../../../utils/spo';
import { validation } from '../../../../utils/validation';
import SpoCommand from '../../../base/SpoCommand';
import commands from '../../commands';
import { TermSet } from './TermSet';

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  id?: string;
  name?: string;
  termGroupId?: string;
  termGroupName?: string;
}

class SpoTermSetGetCommand extends SpoCommand {
  public get name(): string {
    return commands.TERM_SET_GET;
  }

  public get description(): string {
    return 'Gets information about the specified taxonomy term set';
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
        id: typeof args.options.id !== 'undefined',
        name: typeof args.options.name !== 'undefined',
        termGroupId: typeof args.options.termGroupId !== 'undefined',
        termGroupName: typeof args.options.termGroupName !== 'undefined'
      });
    });
  }

  #initOptions(): void {
    this.options.unshift(
      {
        option: '-i, --id [id]'
      },
      {
        option: '-n, --name [name]'
      },
      {
        option: '--termGroupId [termGroupId]'
      },
      {
        option: '--termGroupName [termGroupName]'
      }
    );
  }

  #initValidators(): void {
    this.validators.push(
      async (args: CommandArgs) => {
        if (args.options.id) {
          if (!validation.isValidGuid(args.options.id)) {
            return `${args.options.id} is not a valid GUID`;
          }
        }

        if (args.options.termGroupId) {
          if (!validation.isValidGuid(args.options.termGroupId)) {
            return `${args.options.termGroupId} is not a valid GUID`;
          }
        }

        return true;
      }
    );
  }

  #initOptionSets(): void {
    this.optionSets.push(
      ['id', 'name'],
      ['termGroupId', 'termGroupName']
    );
  }

  public async commandAction(logger: Logger, args: CommandArgs): Promise<void> {
    try {
      const spoAdminUrl: string = await spo.getSpoAdminUrl(logger, this.debug);
      const res: ContextInfo = await spo.getRequestDigest(spoAdminUrl);
      if (this.verbose) {
        logger.logToStderr(`Retrieving taxonomy term set...`);
      }

      const termGroupQuery: string = args.options.termGroupId ? `<Method Id="62" ParentId="60" Name="GetById"><Parameters><Parameter Type="Guid">{${args.options.termGroupId}}</Parameter></Parameters></Method>` : `<Method Id="62" ParentId="60" Name="GetByName"><Parameters><Parameter Type="String">${formatting.escapeXml(args.options.termGroupName)}</Parameter></Parameters></Method>`;
      const termSetQuery: string = args.options.id ? `<Method Id="67" ParentId="65" Name="GetById"><Parameters><Parameter Type="Guid">{${args.options.id}}</Parameter></Parameters></Method>` : `<Method Id="67" ParentId="65" Name="GetByName"><Parameters><Parameter Type="String">${formatting.escapeXml(args.options.name)}</Parameter></Parameters></Method>`;

      const requestOptions: any = {
        url: `${spoAdminUrl}/_vti_bin/client.svc/ProcessQuery`,
        headers: {
          'X-RequestDigest': res.FormDigestValue
        },
        data: `<Request AddExpandoFieldTypeSuffix="true" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}" xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009"><Actions><ObjectPath Id="55" ObjectPathId="54" /><ObjectIdentityQuery Id="56" ObjectPathId="54" /><ObjectPath Id="58" ObjectPathId="57" /><ObjectIdentityQuery Id="59" ObjectPathId="57" /><ObjectPath Id="61" ObjectPathId="60" /><ObjectPath Id="63" ObjectPathId="62" /><ObjectIdentityQuery Id="64" ObjectPathId="62" /><ObjectPath Id="66" ObjectPathId="65" /><ObjectPath Id="68" ObjectPathId="67" /><ObjectIdentityQuery Id="69" ObjectPathId="67" /><Query Id="70" ObjectPathId="67"><Query SelectAllProperties="true"><Properties><Property Name="Name" ScalarProperty="true" /><Property Name="Id" ScalarProperty="true" /></Properties></Query></Query></Actions><ObjectPaths><StaticMethod Id="54" Name="GetTaxonomySession" TypeId="{981cbc68-9edc-4f8d-872f-71146fcbb84f}" /><Method Id="57" ParentId="54" Name="GetDefaultSiteCollectionTermStore" /><Property Id="60" ParentId="57" Name="Groups" />${termGroupQuery}<Property Id="65" ParentId="62" Name="TermSets" />${termSetQuery}</ObjectPaths></Request>`
      };

      const processQuery: string = await request.post(requestOptions);
      const json: ClientSvcResponse = JSON.parse(processQuery);
      const response: ClientSvcResponseContents = json[0];
      if (response.ErrorInfo) {
        throw response.ErrorInfo.ErrorMessage;
      }

      const termSet: TermSet = json[json.length - 1];
      delete termSet._ObjectIdentity_;
      delete termSet._ObjectType_;
      termSet.CreatedDate = new Date(Number(termSet.CreatedDate.replace('/Date(', '').replace(')/', ''))).toISOString();
      termSet.Id = termSet.Id.replace('/Guid(', '').replace(')/', '');
      termSet.LastModifiedDate = new Date(Number(termSet.LastModifiedDate.replace('/Date(', '').replace(')/', ''))).toISOString();
      logger.log(termSet);      
    } 
    catch (err: any) {
      this.handleRejectedODataJsonPromise(err);
    }
  }
}

module.exports = new SpoTermSetGetCommand();