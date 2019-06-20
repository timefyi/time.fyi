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
      --oneline    Shows each comment in single line
      --comments   Type of comments required FIXME/TODO/DOCME/TESTME
      --no-stats   Do not show the stats at the end
      --author     Name of the author to show the comments from
`, {
  boolean: [
    'oneline',
    'comments',
    'no-stats',
    'author'
  ],
});

render(React.createElement(ui, cli.flags));
