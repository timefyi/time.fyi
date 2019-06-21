'use strict';

const path = require('path');
const React = require('react');
const moment = require('moment');
const figures = require('figures');
const gitGrep = require('git-grep');
const gitBlame = require('git-blame');
const PropTypes = require('prop-types');
const { Color, Static, Box } = require('ink');

class Finder extends React.Component {
  constructor(props) {
    super(props);
    const projectPath = path.resolve(path.join(__dirname, '../../neo/ounass'));
    const repoPath = path.join(projectPath, '.git');

    // Comment types to be checked
    this.commentTypes = ['TESTME', 'DOCME', 'FIXME', 'TODO'];

    this.state = {
      projectPath,
      repoPath,
      // Counters that will be populated while the comments are being
      // read. Used to show the stats
      commentCounters: {
        todo: 0,
        fixme: 0,
        testme: 0,
        docme: 0,
      },
      // Each of the blame is emitted in two chunks line
      // and commit. This counter will be held here to identify
      // if all the blames have been collected — @todo refactor
      blameCounters: {
        line: 0,
        commit: 0,
      },
      // Raw comments holds the vanilla "git grep" comments
      rawComments: {},
      // Prepared holds the populated blame and commit info alongside
      preparedComments: {},
    };

    this.handleError = this.handleError.bind(this);
    this.onCommentFound = this.onCommentFound.bind(this);
    this.onBlameFound = this.onBlameFound.bind(this);
    this.normalizeComment = this.normalizeComment.bind(this);
    this.findOldestComment = this.findOldestComment.bind(this);
    this.humanizeTimeStamp = this.humanizeTimeStamp.bind(this);
    this.hasFilters = this.hasFilters.bind(this);
    this.getFilteredComments = this.getFilteredComments.bind(this);
    this.countTypes = this.countTypes.bind(this);
  }

  hasFilters() {
    const hasAuthor = !!this.props.author;
    const hasType = !!this.props.type;

    return hasAuthor || hasType;
  }

  getFilteredComments() {
    if (!this.hasFilters()) {
      return { ...this.state.preparedComments };
    }

    const requiredType = (this.props.type || '').toUpperCase();
    const requiredAuthor = (this.props.author || '').toUpperCase();
    const comments = this.state.preparedComments || {};
    const filteredComments = [];

    // Filter the comments matching the given criteria
    for (let hash in comments) {
      if (!comments.hasOwnProperty(hash)) {
        continue;
      }

      const comment = comments[hash];
      const author = (comment.author || {});
      const authorName = (author.name || '').toUpperCase();
      const commentText = (comment.content || '').toUpperCase();

      // If type filter is given and the type of comment does not match
      if (requiredType && commentText.indexOf(requiredType) === -1) {
        continue;
      } else if (requiredAuthor && authorName.indexOf(requiredAuthor) === -1) {
        continue;
      }

      filteredComments.push({ ...comment });
    }

    return filteredComments;
  }


  onBlameFound(rawHash, type, blame) {
    const hash = `${rawHash}${blame.hash}`;

    this.setState(state => {
      const blameCounters = { ...state.blameCounters };
      blameCounters[type] = (blameCounters[type] || 0) + 1;

      // Normalize the blame comment if available
      // and populate the relevant stats in the state
      if (blame.content) {
        blame.content = this.normalizeComment(blame.content);
      }

      return {
        blameCounters,
        preparedComments: {
          ...state.preparedComments,
          // set the newly found counter in the prepared comments
          [hash]: {
            ...(state.preparedComments[hash] || {}),
            ...blame
          }
        }
      }
    });
  }

  onCommentFound(comment) {
    let { file, line, text } = comment;
    text = text.replace(/\s*$/, '');

    const hash = encodeURI(`${file}${line}${text}`);

    // Set the newly found raw comment in state
    this.setState(state => ({
      rawComments: {
        ...state.rawComments,
        [hash]: {
          ...(state.rawComments[hash] || {}),
          ...comment
        }
      }
    }));

    // Get the commit details and date for when this comment was added
    gitBlame(this.state.repoPath, { file, limitLines: `${comment.line},${comment.line}`, })
      .on('data', (type, blame) => this.onBlameFound(hash, type, blame))
      .on('error', this.handleError)
      .on('end', () => null);
  }

  handleError(err) {
    console.log(err);
  }

  loadComments() {
    gitGrep(this.state.repoPath, { rev: 'HEAD', term: `(${this.commentTypes.join(')|(')})` })
      .on('data', this.onCommentFound)
      .on('error', this.handleError)
      .on('end', () => null);
  }

  componentDidMount() {
    this.loadComments();
  }

  normalizeComment(content) {
    // Remove the spaces from both ends of the comment
    let normalizedComment = (content || '')
      .replace(/^\s+/, '')
      .replace(/\s+$/, '');

    // List of comment expressions
    const commentRegexList = [
      { start: /^.*?\/\/\s*/, end: null, comment: '//' },
      { start: /^.*?#\s*/, end: null, comment: '#' },
      { start: /^.*?\/*\s*/, end: /\s*\*\}\s*$/, comment: '/*' },
      { start: /^.*?\{\s*\/\*\s*/, end: /\*\/\s*\}\s*$/, comment: '{/*' },
    ];

    let applicableRegex = null;
    let earliestPosition = -1;

    // Git blame might give the code on line before the comment i.e.
    // in the cases when the comment has been left in front of
    // the line of code. Here we iterate and find the type of comment
    // applied to the given line of code
    commentRegexList.forEach(commentRegex => {
      // The position where the comment starts
      const matchPosition = normalizedComment.indexOf(commentRegex.comment);
      if (matchPosition === -1) {
        return;
      }

      // We have got a position before and
      // this comment lies after the position that we have, ignore
      if (earliestPosition !== -1 && matchPosition > earliestPosition) {
        return;
      }

      // If this matched comment lies before the last comment match, take this
      earliestPosition = matchPosition;
      applicableRegex = commentRegex;
    });

    // No matching comment was found
    if (!applicableRegex) {
      return normalizedComment;
    }

    if (applicableRegex.start) {
      normalizedComment = normalizedComment.replace(applicableRegex.start, '');
    }

    if (applicableRegex.end) {
      normalizedComment = normalizedComment.replace(applicableRegex.end, '');
    }

    return normalizedComment;
  }

  findOldestComment(comments) {
    let oldestComment = {};

    Object.keys(comments).forEach(hash => {
      const currentComment = comments[hash];
      const currentStamp = (currentComment.author || {}).timestamp;
      const oldestStamp = (oldestComment.author || {}).timestamp;

      if (!oldestStamp || currentStamp < oldestStamp) {
        oldestComment = currentComment;
      }
    });

    return oldestComment;
  }

  renderLoading() {
    return (
      <React.Fragment>
        <Color yellow>Total {Object.keys(this.state.rawComments).length} comments found</Color>
        <Color green>Loading ...</Color>
      </React.Fragment>
    );
  }

  countTypes(comments) {
    const counters = {};
    const availableTypes = this.commentTypes;

    for (let hash in comments) {
      if (!comments.hasOwnProperty(hash)) {
        continue;
      }

      const comment = comments[hash];
      // Identify and increase the counter for the comment type
      availableTypes.forEach(availableType => {
        availableType = availableType.toLowerCase();

        if (((comment.content || '').toLowerCase()).indexOf(availableType) !== -1) {
          counters[availableType] = (counters[availableType] || 0) + 1;
        }
      });
    }

    return counters;
  }

  renderStats(comments) {
    const totalComments = Object.keys(comments).length;
    if (!totalComments) {
      return null;
    }

    const oldestComment = this.findOldestComment(comments);
    const oldestAuthor = (oldestComment.author || {});
    const commentCounters = this.countTypes(comments);

    return (
      <Box flexDirection='column' padding={1} marginLeft={6}>
        {
          Object.keys(commentCounters).map(counterType => {
            if (!commentCounters[counterType]) {
              return;
            }

            return (
              <Box key={counterType}>
                <Box width={20}><Color bold>{counterType.toUpperCase()} Count</Color></Box>
                <Box><Color yellow>{commentCounters[counterType]}</Color></Box>
              </Box>
            );
          })
        }

        <Box>
          <Box width={20}><Color bold>Total Comments</Color></Box>
          <Box><Color yellow>{totalComments}</Color></Box>
        </Box>
        <Box>
          <Box width={20}><Color bold>Oldest Comment</Color></Box>
          <Box><Color yellow>{this.humanizeTimeStamp(oldestAuthor.timestamp)}</Color></Box>
        </Box>
        <Box>
          <Box width={20}><Color bold>Oldest Commenter</Color></Box>
          <Box><Color yellow>{oldestAuthor.name || ''}</Color></Box>
        </Box>
        <Box>
          <Box width={20}><Color bold>Oldest Comment</Color></Box>
          <Box><Color yellow>{oldestComment.content || ''}</Color></Box>
        </Box>
      </Box>
    );
  }

  humanizeTimeStamp(timestamp) {
    const nowTime = moment();
    const thenTime = moment.unix(timestamp);

    return moment.duration(thenTime.diff(nowTime)).humanize(true);
  }

  renderMultiline(comments) {
    return (
      <React.Fragment>
        <Static>
          {
            Object.keys(comments).map((hash, counter) => {
              const comment = comments[hash];
              const author = comment.author || {};
              const diffTime = this.humanizeTimeStamp(author.timestamp);

              return (
                <Box key={hash} flexDirection='row' paddingLeft={2} paddingTop={1}>
                  <Box width={3}>
                    <Color blue bold>{figures('❯︎')}</Color>
                  </Box>
                  <Box flexDirection='column'>
                    <Box marginLeft={1}><Color yellow>{comment.content}</Color></Box>
                    <Box>
                      <Box marginRight={1}><Color>Commit:</Color></Box>
                      <Box marginRight={1}><Color>({comment.hash.substring(0, 7)})</Color></Box>
                      <Box><Color>{comment.summary}</Color></Box>
                    </Box>
                    <Box>
                      <Box marginRight={2}><Color>File:</Color></Box>
                      <Color>{comment.filename}:{comment.finalLine}</Color>
                    </Box>
                    <Box><Color gray>{author.name} commented {diffTime}</Color></Box>
                  </Box>
                </Box>)
            })
          }

        </Static>
        {this.renderStats(comments)}
      </React.Fragment>
    );
  }

  isFinishedLoading() {
    const rawComments = this.state.rawComments;
    const preparedComments = this.state.preparedComments;
    const commentsLoaded = Object.keys(rawComments).length === Object.keys(preparedComments).length;
    const blamesLoaded = this.state.blameCounters.line === this.state.blameCounters.commit;

    return commentsLoaded && blamesLoaded;
  }

  renderOneLine(comments) {
    return (
      <React.Fragment>
        <Static>
          {
            Object.keys(comments).map((hash, counter) => {
              const comment = comments[hash];
              const author = comment.author || {};
              const diffTime = this.humanizeTimeStamp(author.timestamp);

              return (
                <Box key={hash} paddingLeft={2} paddingTop={counter === 0 ? 1 : 0}>
                  <Box width={3}><Color blue bold>{figures('❯︎')}</Color></Box>
                  <Box width={14} textWrap="truncate-end"><Color cyanBright>{diffTime}</Color></Box>
                  <Box><Color yellow>{comment.content || ''}</Color></Box>
                </Box>
              )
            })
          }
        </Static>
        {this.renderStats(comments)}
      </React.Fragment>
    );
  }

  render() {
    if (!this.isFinishedLoading()) {
      return this.renderLoading();
    }

    // @TODO Filter while comments are being read
    const comments = this.getFilteredComments(this.state.preparedComments);
    if (this.props.oneline) {
      return this.renderOneLine(comments);
    }

    return this.renderMultiline(comments);
  }
}

Finder.propTypes = {
  oneline: PropTypes.bool,
  type: PropTypes.string,
  author: PropTypes.string,
};

module.exports = Finder;
