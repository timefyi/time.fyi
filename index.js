#!/usr/bin/env node
'use strict';
const fs = require('fs');
const meow = require('meow');
const path = require('path');
const React = require('react');
const { render } = require('ink');
const importJsx = require('import-jsx');

const ui = importJsx('./finder');

const cli = meow(`
    Usage
      $ git pending [options]

    Example
      # gets all the pending todo, fixme, testme and docme comments
      $ git pending [options]

      $ git pending --oneline 
      $ git pending -o
      # shows the comments in non-verbose manner

      $ git pending --type "FIXME"
      $ git pending -t "FIXME"
      # gets only the given type of comments e.g. "FIXME"

      $ git pending --type "FIXME" --author kamran --oneline
      # gets all the fixme comments by kamran

    Options
      --oneline -o    Shows each comment in single line
      --type -t       Type of comments required FIXME/TODO/DOCME/TESTME
      --author -a     Name of the author to show the comments from
      --no-stats      Do not show the stats
`, {
  flags: {
    'oneline': { type: 'boolean', alias: 'o' },
    'stats': { type: 'boolean', alias: 's', default: true },
    'type': { type: 'string', alias: 't' },
    'author': { type: 'string', alias: 'a' },
  },
});

cli.flags = cli.flags || {};
cli.flags.path = process.cwd();

// Check if the given path is valid git repository
if (!fs.existsSync(path.join(cli.flags.path, '/.git'))) {
  console.log('The command must be run inside a git repository');
  process.exit(1);
}

render(React.createElement(ui, cli.flags));
