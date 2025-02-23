import * as assert from 'assert';
import * as sinon from 'sinon';
import appInsights from '../../../../appInsights';
import auth from '../../../../Auth';
import { Cli } from '../../../../cli/Cli';
import { CommandInfo } from '../../../../cli/CommandInfo';
import { Logger } from '../../../../cli/Logger';
import Command, { CommandError } from '../../../../Command';
import request from '../../../../request';
import { pid } from '../../../../utils/pid';
import { sinonUtil } from '../../../../utils/sinonUtil';
import commands from '../../commands';
const command: Command = require('./site-apppermission-remove');

describe(commands.SITE_APPPERMISSION_REMOVE, () => {
  let log: string[];
  let logger: Logger;
  let commandInfo: CommandInfo;
  let promptOptions: any;

  let deleteRequestStub: sinon.SinonStub;

  const site = {
    "id": "contoso.sharepoint.com,00000000-0000-0000-0000-000000000000,00000000-0000-0000-0000-000000000000",
    "displayName": "OneDrive Team Site",
    "name": "1drvteam",
    "createdDateTime": "2017-05-09T20:56:00Z",
    "lastModifiedDateTime": "2017-05-09T20:56:01Z",
    "webUrl": "https://contoso.sharepoint.com/sites/sitecollection-name"
  };

  const response = {
    "value": [
      {
        "id": "aTowaS50fG1zLnNwLmV4dHw4OWVhNWM5NC03NzM2LTRlMjUtOTVhZC0zZmE5NWY2MmI2NmVAZGUzNDhiYzctMWFlYi00NDA2LThjYjMtOTdkYjAyMWNhZGI0",
        "grantedToIdentities": [
          {
            "application": {
              "displayName": "Foo",
              "id": "89ea5c94-7736-4e25-95ad-3fa95f62b66e"
            }
          }
        ]
      },
      {
        "id": "aTowaS50fG1zLnNwLmV4dHxkMDVhMmRkYi0xZjMzLTRkZTMtOTMzNS0zYmZiZTUwNDExYzVAZWUyYjdjMGMtZDI1My00YjI3LTk0NmItMDYzZGM4OWNlOGMy",
        "grantedToIdentities": [
          {
            "application": {
              "displayName": "SPRestSample",
              "id": "d05a2ddb-1f33-4de3-9335-3bfbe50411c5"
            }
          }
        ]
      }
    ]
  };

  before(() => {
    sinon.stub(auth, 'restoreAuth').callsFake(() => Promise.resolve());
    sinon.stub(appInsights, 'trackEvent').callsFake(() => { });
    sinon.stub(pid, 'getProcessName').callsFake(() => '');
    auth.service.connected = true;
    commandInfo = Cli.getCommandInfo(command);
  });

  beforeEach(() => {
    log = [];
    logger = {
      log: (msg: string) => {
        log.push(msg);
      },
      logRaw: (msg: string) => {
        log.push(msg);
      },
      logToStderr: (msg: string) => {
        log.push(msg);
      }
    };

    sinon.stub(Cli, 'prompt').callsFake(async (options) => {
      promptOptions = options;
      return { continue: false };
    });

    promptOptions = undefined;

    deleteRequestStub = sinon.stub(request, 'delete').callsFake((opts) => {
      if ((opts.url as string).indexOf('/permissions/') > -1) {
        return Promise.resolve();
      }
      return Promise.reject();
    });
  });

  afterEach(() => {
    sinonUtil.restore([
      request.get,
      request.delete,
      global.setTimeout,
      Cli.prompt
    ]);
  });

  after(() => {
    sinonUtil.restore([
      auth.restoreAuth,
      appInsights.trackEvent,
      pid.getProcessName
    ]);
    auth.service.connected = false;
  });

  it('has correct name', () => {
    assert.strictEqual(command.name.startsWith(commands.SITE_APPPERMISSION_REMOVE), true);
  });

  it('has a description', () => {
    assert.notStrictEqual(command.description, null);
  });

  it('fails validation with an incorrect URL', async () => {
    const actual = await command.validate({
      options: {
        siteUrl: 'https;//contoso,sharepoint:com/sites/sitecollection-name'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('passes validation with a correct URL and a filter value', async () => {
    const actual = await command.validate({
      options: {
        siteUrl: 'https://contoso.sharepoint.com/sites/sitecollection-name',
        appId: '00000000-0000-0000-0000-000000000000'
      }
    }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('fails validation if the appId is not a valid GUID', async () => {
    const actual = await command.validate({
      options: {
        siteUrl: 'https://contoso.sharepoint.com/sites/sitecollection-name',
        appId: '123'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if appId or appDisplayName or permissionId options are not passed', async () => {
    const actual = await command.validate({
      options: {
        siteUrl: 'https://contoso.sharepoint.com/sites/sitecollection-name'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if appId, appDisplayName and permissionId options are passed (multiple options)', async () => {
    const actual = await command.validate({
      options: {
        siteUrl: 'https://contoso.sharepoint.com/sites/sitecollection-name',
        appId: '89ea5c94-7736-4e25-95ad-3fa95f62b66e',
        appDisplayName: 'Foo',
        permissionId: 'aTowaS50fG1zLnNwLmV4dHw4OWVhNWM5NC03NzM2LTRlMjUtOTVhZC0zZmE5NWY2MmI2NmVAZGUzNDhiYzctMWFlYi00NDA2LThjYjMtOTdkYjAyMWNhZGI0'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if appId and appDisplayName both are passed (multiple options)', async () => {
    const actual = await command.validate({
      options: {
        siteUrl: 'https://contoso.sharepoint.com/sites/sitecollection-name',
        appId: '89ea5c94-7736-4e25-95ad-3fa95f62b66e',
        appDisplayName: 'Foo'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if appId and permissionId options are passed (multiple options)', async () => {
    const actual = await command.validate({
      options: {
        siteUrl: 'https://contoso.sharepoint.com/sites/sitecollection-name',
        appId: '89ea5c94-7736-4e25-95ad-3fa95f62b66e',
        permissionId: 'aTowaS50fG1zLnNwLmV4dHw4OWVhNWM5NC03NzM2LTRlMjUtOTVhZC0zZmE5NWY2MmI2NmVAZGUzNDhiYzctMWFlYi00NDA2LThjYjMtOTdkYjAyMWNhZGI0'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if appDisplayName and permissionId options are passed (multiple options)', async () => {
    const actual = await command.validate({
      options: {
        siteUrl: 'https://contoso.sharepoint.com/sites/sitecollection-name',
        appDisplayName: 'Foo',
        permissionId: 'aTowaS50fG1zLnNwLmV4dHw4OWVhNWM5NC03NzM2LTRlMjUtOTVhZC0zZmE5NWY2MmI2NmVAZGUzNDhiYzctMWFlYi00NDA2LThjYjMtOTdkYjAyMWNhZGI0'
      }
    }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('prompts before removing the site apppermission when confirm option not passed', async () => {
    await command.action(logger, {
      options: {
        siteUrl: 'https://contoso.sharepoint.com/sites/sitecollection-name',
        appDisplayName: 'Foo'
      }
    });
    let promptIssued = false;

    if (promptOptions && promptOptions.type === 'confirm') {
      promptIssued = true;
    }
    assert(promptIssued);
  });

  it('aborts removing the site apppermission when prompt not confirmed', async () => {
    sinonUtil.restore(Cli.prompt);

    sinon.stub(Cli, 'prompt').callsFake(async () => (
      { continue: false }
    ));

    await command.action(logger, {
      options: {
        siteUrl: 'https://contoso.sharepoint.com/sites/sitecollection-name',
        appDisplayName: 'Foo'
      }
    });
    assert(deleteRequestStub.notCalled);
  });

  it('removes site apppermission when prompt confirmed (debug)', async () => {
    sinonUtil.restore(Cli.prompt);

    sinon.stub(Cli, 'prompt').callsFake(async () => (
      { continue: true }
    ));

    const getRequestStub = sinon.stub(request, 'get');
    getRequestStub.onCall(0)
      .callsFake((opts) => {
        if ((opts.url as string).indexOf(":/sites/sitecollection-name") > - 1) {
          return Promise.resolve(site);
        }
        return Promise.reject('Invalid request');
      });

    getRequestStub.onCall(1)
      .callsFake((opts) => {
        if ((opts.url as string).indexOf("contoso.sharepoint.com,00000000-0000-0000-0000-000000000000,00000000-0000-0000-0000-000000000000/permissions") > - 1) {
          return Promise.resolve(response);
        }
        return Promise.reject('Invalid request');
      });

    await command.action(logger, {
      options: {
        debug: true,
        siteUrl: 'https://contoso.sharepoint.com/sites/sitecollection-name',
        permissionId: 'aTowaS50fG1zLnNwLmV4dHw4OWVhNWM5NC03NzM2LTRlMjUtOTVhZC0zZmE5NWY2MmI2NmVAZGUzNDhiYzctMWFlYi00NDA2LThjYjMtOTdkYjAyMWNhZGI0'
      }
    });
    assert(deleteRequestStub.called);
  });

  it('removes site apppermission with specified appId', async () => {
    sinonUtil.restore(Cli.prompt);

    sinon.stub(Cli, 'prompt').callsFake(async () => (
      { continue: true }
    ));    

    const getRequestStub = sinon.stub(request, 'get');
    getRequestStub.onCall(0)
      .callsFake((opts) => {
        if ((opts.url as string).indexOf(":/sites/sitecollection-name") > - 1) {
          return Promise.resolve(site);
        }
        return Promise.reject('Invalid request');
      });

    getRequestStub.onCall(1)
      .callsFake((opts) => {
        if ((opts.url as string).indexOf("contoso.sharepoint.com,00000000-0000-0000-0000-000000000000,00000000-0000-0000-0000-000000000000/permissions") > - 1) {
          return Promise.resolve(response);
        }
        return Promise.reject('Invalid request');
      });

    await command.action(logger, {
      options: {
        siteUrl: 'https://contoso.sharepoint.com/sites/sitecollection-name',
        appId: '89ea5c94-7736-4e25-95ad-3fa95f62b66e',
        confirm: true
      }
    });
    assert(deleteRequestStub.called);
  });

  it('removes site apppermission with specified appDisplayName', async () => {
    sinonUtil.restore(Cli.prompt);

    sinon.stub(Cli, 'prompt').callsFake(async () => (
      { continue: true }
    ));    

    const getRequestStub = sinon.stub(request, 'get');
    getRequestStub.onCall(0)
      .callsFake((opts) => {
        if ((opts.url as string).indexOf(":/sites/sitecollection-name") > - 1) {
          return Promise.resolve(site);
        }
        return Promise.reject('Invalid request');
      });

    getRequestStub.onCall(1)
      .callsFake((opts) => {
        if ((opts.url as string).indexOf("contoso.sharepoint.com,00000000-0000-0000-0000-000000000000,00000000-0000-0000-0000-000000000000/permissions") > - 1) {
          return Promise.resolve(response);
        }
        return Promise.reject('Invalid request');
      });

    await command.action(logger, {
      options: {
        siteUrl: 'https://contoso.sharepoint.com/sites/sitecollection-name',
        appDisplayName: 'Foo',
        confirm: true
      }
    });
    assert(deleteRequestStub.called);
  });

  it('handles error correctly', async () => {
    sinon.stub(request, 'get').callsFake(() => {
      return Promise.reject('An error has occurred');
    });

    await assert.rejects(command.action(logger, { options: {
      siteUrl: 'https://contoso.sharepoint.com/sites/sitecollection-name',
      appDisplayName: 'Foo',
      confirm: true } } as any), new CommandError('An error has occurred'));
  });

  it('supports debug mode', () => {
    const options = command.options;
    let containsOption = false;
    options.forEach(o => {
      if (o.option === '--debug') {
        containsOption = true;
      }
    });
    assert(containsOption);
  });
});
