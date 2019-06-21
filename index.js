#!/usr/bin/env node
'use strict';
const meow = require('meow');
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
      # shows the comments in non-verbose manner

      $ git pending --comments "FIXME" 
      # gets only the given type of comments e.g. "FIXME"

    Options
      --oneline -o    Shows each comment in single line
      --type -t       Type of comments required FIXME/TODO/DOCME/TESTME
      --author -a     Name of the author to show the comments from
`, {
  flags: {
    'oneline': { type: 'boolean', alias: 'o' },
    'type': { type: 'string', alias: 't' },
    'author': { type: 'string', alias: 'a' }
  },
});

render(React.createElement(ui, cli.flags));
