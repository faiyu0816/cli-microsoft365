import * as assert from 'assert';
import * as sinon from 'sinon';
import appInsights from '../../../appInsights';
import auth from '../../../Auth';
import { Cli } from '../../../cli/Cli';
import { CommandInfo } from '../../../cli/CommandInfo';
import { Logger } from '../../../cli/Logger';
import Command, { CommandError } from '../../../Command';
import request from '../../../request';
import { pid } from '../../../utils/pid';
import { sinonUtil } from '../../../utils/sinonUtil';
import commands from '../commands';
const command: Command = require('./yammer-search');

describe(commands.SEARCH, () => {
  let log: string[];
  let logger: Logger;
  let loggerLogSpy: sinon.SinonSpy;
  let commandInfo: CommandInfo;

  const messageTrimming: any = {
    "count": {
      "messages": 4,
      "groups": 0,
      "topics": 0,
      "users": 0
    },
    "messages": {
      "messages": [{
        "id": 11111,
        "content_excerpt": "this is a very long message. Longer than 80 chars. this is a very long message. Longer than 80 chars. this is a very long message. Longer than 80 chars. this is a very long message. Longer than 80 chars. this is a very long message. Longer than 80 chars. this is a very long message. Longer than 80 chars. "
      },
      {
        "id": 11112,
        "content_excerpt": "short"
      },
      {
        "id": 11113,
        "content_excerpt": undefined
      },
      {
        "id": 11114,
        "content_excerpt": "shortmessage"
      }]
    },
    "groups": [],
    "topics": [],
    "users": []
  };

  const searchResults: any = {
    "count": {
      "messages": 4,
      "groups": 2,
      "topics": 5,
      "users": 4
    },
    "messages": {
      "messages": [{
        "id": 11111
      },
      {
        "id": 11112
      },
      {
        "id": 11113
      },
      {
        "id": 11114
      }]
    },
    "groups": [
      {
        "id": 2221
      },
      {
        "id": 2222
      }
    ],
    "topics": [
      {
        "id": 3331
      },
      {
        "id": 3332
      },
      {
        "id": 3333
      },
      {
        "id": 3334
      },
      {
        "id": 3335
      }
    ],
    "users": [
      {
        "id": 4441
      },
      {
        "id": 4442
      },
      {
        "id": 4443
      },
      {
        "id": 4444
      }
    ]
  };

  const longSearchResult: any = {
    "count": {
      "messages": 24,
      "groups": 0,
      "topics": 0,
      "users": 0
    },
    "messages": {
      "messages": [{
        "id": 11115
      },
      {
        "id": 11116
      },
      {
        "id": 11117
      },
      {
        "id": 11118
      },
      {
        "id": 11119
      },
      {
        "id": 11120
      },
      {
        "id": 11121
      },
      {
        "id": 11122
      },
      {
        "id": 11123
      },
      {
        "id": 11124
      },
      {
        "id": 11125
      },
      {
        "id": 11127
      },
      {
        "id": 11128
      },
      {
        "id": 11129
      },
      {
        "id": 11130
      },
      {
        "id": 11131
      },
      {
        "id": 11132
      },
      {
        "id": 11133
      },
      {
        "id": 11134
      },
      {
        "id": 11135
      }]
    },
    "groups": [],
    "topics": [],
    "users": []
  };

  const searchResults2: any = {
    "count": {
      "messages": 4,
      "groups": 2,
      "topics": 5,
      "users": 4
    },
    "messages": {
      "messages": []
    },
    "groups": [],
    "topics": [],
    "users": []
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
    loggerLogSpy = sinon.spy(logger, 'log');
    (command as any).items = [];
  });

  afterEach(() => {
    sinonUtil.restore([
      request.get
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
    assert.strictEqual(command.name.startsWith(commands.SEARCH), true);
  });

  it('has a description', () => {
    assert.notStrictEqual(command.description, null);
  });

  it('correctly handles error', async() => {
    sinon.stub(request, 'get').callsFake(() => {
      return Promise.reject({
        "error": {
          "base": "An error has occurred."
        }
      });
    });

    await assert.rejects(command.action(logger, { options: { debug: false } } as any), new CommandError('An error has occurred.'));
  });

  it('does not pass validation without parameters', async () => {
    const actual = await command.validate({ options: {} }, commandInfo);
    assert.notStrictEqual(actual, false);
  });

  it('passes validation with one parameter', async () => {
    const actual = await command.validate({ options: { queryText: '123123' } }, commandInfo);
    assert.notStrictEqual(actual, false);
  });

  it('passes validation with parameters', async () => {
    const actual = await command.validate({ options: { queryText: '123', limit: 10, output: 'json' } }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('fails validation with parameters', async () => {
    const actual = await command.validate({ options: { queryText: '123', show: "summary", output: 'json' } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails if a wrong option is passed', async () => {
    const actual = await command.validate({ options: { queryText: '123', show: 'wrongOption' } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('passes if a correct option is passed', async () => {
    const options = ['summary', 'messages', 'users', 'topics', 'groups'];
    options.forEach(async (option) => {
      const actual = await command.validate({ options: { queryText: '123', show: option } }, commandInfo);
      assert.strictEqual(actual, true, option);
    });
  });

  it('limit must be a number', async () => {
    const actual = await command.validate({ options: { queryText: '123', limit: 'abc', output: 'json' } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('passes validation if queryText is a string', async () => {
    const actual = await command.validate({ options: { queryText: 'abc' } }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('does not pass validation if queryText is a number', async () => {
    const actual = await command.validate({ options: { queryText: 123 } }, commandInfo);
    assert.notStrictEqual(actual, true);
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

  it('returns all items', async () => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://www.yammer.com/api/v1/search.json?search=contents&page=1') {
        return Promise.resolve(searchResults);
      }
      return Promise.reject('Invalid request');
    });

    await command.action(logger, { options: { queryText: "contents" } } as any);
    
    const result = loggerLogSpy.lastCall.args[0];
    assert.strictEqual(result.length, 15);
    assert.strictEqual(result[0].id, 11111);
    assert.strictEqual(result[1].id, 11112);
    assert.strictEqual(result[2].id, 11113);
    assert.strictEqual(result[3].id, 11114);
    assert.strictEqual(result[4].id, 3331);
    assert.strictEqual(result[5].id, 3332);
    assert.strictEqual(result[6].id, 3333);
    assert.strictEqual(result[7].id, 3334);
    assert.strictEqual(result[8].id, 3335);
    assert.strictEqual(result[9].id, 4441);
    assert.strictEqual(result[10].id, 4442);
    assert.strictEqual(result[11].id, 4443);
    assert.strictEqual(result[12].id, 4444);
    assert.strictEqual(result[13].id, 2221);
    assert.strictEqual(result[14].id, 2222);
  });

  it('returns long search result', async () => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://www.yammer.com/api/v1/search.json?search=contents&page=1') {
        return Promise.resolve(longSearchResult);
      }
      if (opts.url === 'https://www.yammer.com/api/v1/search.json?search=contents&page=2') {
        return Promise.resolve(searchResults);
      }
      return Promise.reject('Invalid request');
    });

    await command.action(logger, { options: { queryText: "contents", show: "messages" } } as any);

    const result = loggerLogSpy.lastCall.args[0];
    assert.strictEqual(result.length, 24);
  });

  it('returns the summary', async () => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://www.yammer.com/api/v1/search.json?search=contents&page=1') {
        return Promise.resolve(searchResults);
      }
      return Promise.reject('Invalid request');
    });

    await command.action(logger, { options: { queryText: "contents", show: "summary" } } as any);

    assert.strictEqual(loggerLogSpy.lastCall.args[0].messages, 4);
    assert.strictEqual(loggerLogSpy.lastCall.args[0].groups, 2);
    assert.strictEqual(loggerLogSpy.lastCall.args[0].topics, 5);
    assert.strictEqual(loggerLogSpy.lastCall.args[0].users, 4);
  });

  it('trims the output message', async () => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://www.yammer.com/api/v1/search.json?search=contents&page=1') {
        return Promise.resolve(messageTrimming);
      }
      return Promise.reject('Invalid request');
    });

    await command.action(logger, { options: { queryText: "contents" } } as any);

    const result = loggerLogSpy.lastCall.args[0];
    assert.strictEqual(result.length, 4);
    assert.strictEqual(result[0].id, 11111);
    assert.strictEqual(result[0].description.length, 83);
    assert.strictEqual(result[1].id, 11112);
    assert.strictEqual(result[1].description.length, 5);
    assert.strictEqual(result[2].id, 11113);
    assert.strictEqual(result[3].id, 11114);
    assert.strictEqual(result[3].description.length, 12);
  });

  it('trims the output message with message filter', async () => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://www.yammer.com/api/v1/search.json?search=contents&page=1') {
        return Promise.resolve(messageTrimming);
      }
      return Promise.reject('Invalid request');
    });

    await command.action(logger, { options: { queryText: "contents", show: "messages" } } as any);

    const result = loggerLogSpy.lastCall.args[0];
    assert.strictEqual(result.length, 4);
    assert.strictEqual(result[0].id, 11111);
    assert.strictEqual(result[0].description.length, 83);
    assert.strictEqual(result[1].id, 11112);
    assert.strictEqual(result[1].description.length, 5);
    assert.strictEqual(result[2].id, 11113);
    assert.strictEqual(result[3].id, 11114);
    assert.strictEqual(result[3].description.length, 12);
  });

  it('returns message output', async () => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://www.yammer.com/api/v1/search.json?search=contents&page=1') {
        return Promise.resolve(searchResults);
      }
      return Promise.reject('Invalid request');
    });

    await command.action(logger, { options: { queryText: "contents", show: "messages" } } as any);

    const result = loggerLogSpy.lastCall.args[0];
    assert.strictEqual(result.length, 4);
    assert.strictEqual(result[0].id, 11111);
    assert.strictEqual(result[1].id, 11112);
    assert.strictEqual(result[2].id, 11113);
    assert.strictEqual(result[3].id, 11114);
  });

  it('returns topic output', async () => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://www.yammer.com/api/v1/search.json?search=contents&page=1') {
        return Promise.resolve(searchResults);
      }
      return Promise.reject('Invalid request');
    });

    await command.action(logger, { options: { queryText: "contents", show: "topics" } } as any);

    const result = loggerLogSpy.lastCall.args[0];
    assert.strictEqual(result.length, 5);
    assert.strictEqual(result[0].id, 3331);
    assert.strictEqual(result[1].id, 3332);
    assert.strictEqual(result[2].id, 3333);
    assert.strictEqual(result[3].id, 3334);
    assert.strictEqual(result[4].id, 3335);
  });

  it('returns groups output', async () => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://www.yammer.com/api/v1/search.json?search=contents&page=1') {
        return Promise.resolve(searchResults);
      }
      return Promise.reject('Invalid request');
    });

    await command.action(logger, { options: { queryText: "contents", show: "groups" } } as any);

    const result = loggerLogSpy.lastCall.args[0];
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].id, 2221);
    assert.strictEqual(result[1].id, 2222);
  });

  it('returns users output', async () => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://www.yammer.com/api/v1/search.json?search=contents&page=1') {
        return Promise.resolve(searchResults);
      }
      return Promise.reject('Invalid request');
    });

    await command.action(logger, { options: { queryText: "contents", show: "users" } } as any);

    const result = loggerLogSpy.lastCall.args[0];
    assert.strictEqual(result.length, 4);
    assert.strictEqual(result[0].id, 4441);
    assert.strictEqual(result[1].id, 4442);
    assert.strictEqual(result[2].id, 4443);
    assert.strictEqual(result[3].id, 4444);
  });

  it('returns limited results', async () => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://www.yammer.com/api/v1/search.json?search=contents&page=1') {
        return Promise.resolve(searchResults);
      }
      return Promise.reject('Invalid request');
    });

    await command.action(logger, { options: { queryText: "contents", limit: 1, output: "json" } } as any);

    assert.strictEqual(loggerLogSpy.lastCall.args[0].summary.messages, 4, "summary returns 4 messages");
    assert.strictEqual(loggerLogSpy.lastCall.args[0].summary.groups, 2, "sumamry returns 2 groups");
    assert.strictEqual(loggerLogSpy.lastCall.args[0].summary.topics, 5, "summary return two topics");
    assert.strictEqual(loggerLogSpy.lastCall.args[0].summary.users, 4, "summary returns 4 users");
    assert.strictEqual(loggerLogSpy.lastCall.args[0].messages.length, 1, "message arary returns 1 message");
    assert.strictEqual(loggerLogSpy.lastCall.args[0].groups.length, 1, "groups array returns 1 group");
    assert.strictEqual(loggerLogSpy.lastCall.args[0].topics.length, 1, "topics array returns 1 topic");
    assert.strictEqual(loggerLogSpy.lastCall.args[0].users.length, 1, "users array returns 1 user");
  });

  it('returns all results', async () => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://www.yammer.com/api/v1/search.json?search=contents&page=1') {
        return Promise.resolve(searchResults);
      }
      if (opts.url === 'https://www.yammer.com/api/v1/search.json?search=contents&page=2') {
        return Promise.resolve(searchResults2);
      }
      return Promise.reject('Invalid request');
    });

    await command.action(logger, { options: { queryText: "contents", output: "json" } } as any);

    assert.strictEqual(loggerLogSpy.lastCall.args[0].summary.messages, 4, "summary returns 4 messages");
    assert.strictEqual(loggerLogSpy.lastCall.args[0].summary.groups, 2, "sumamry returns 2 groups");
    assert.strictEqual(loggerLogSpy.lastCall.args[0].summary.topics, 5, "summary return two topics");
    assert.strictEqual(loggerLogSpy.lastCall.args[0].summary.users, 4, "summary returns 4 users");
    assert.strictEqual(loggerLogSpy.lastCall.args[0].messages.length, 4, "message arary returns 4 entries");
    assert.strictEqual(loggerLogSpy.lastCall.args[0].groups.length, 2, "groups array returns 2 groups");
    assert.strictEqual(loggerLogSpy.lastCall.args[0].topics.length, 5, "topics array returns 2 topics");
    assert.strictEqual(loggerLogSpy.lastCall.args[0].users.length, 4, "users array returns 4 users");
  });

  it('handles error in loop', async () => {
    sinon.stub(request, 'get').callsFake((opts) => {
      if (opts.url === 'https://www.yammer.com/api/v1/search.json?search=contents&page=1') {
        return Promise.resolve(longSearchResult);
      }
      if (opts.url === 'https://www.yammer.com/api/v1/search.json?search=contents&page=2') {
        return Promise.reject({
          "error": {
            "base": "An error has occurred."
          }
        });
      }

      return Promise.reject('Invalid request');
    });

    await assert.rejects(command.action(logger, { options: { queryText: "contents", output: "json" } } as any), new CommandError('An error has occurred.'));
  });
}); 