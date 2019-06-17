const path = require('path');
const React = require('react');
const gitGrep = require('git-grep');
const gitBlame = require('git-blame');
const { render, Color, Static, Box } = require('ink');

class Finder extends React.Component {
  constructor(props) {
    super(props);
    const projectPath = path.resolve(path.join(__dirname, '../../neo/ounass'));
    const repoPath = path.join(projectPath, '.git');

    this.state = {
      projectPath,
      repoPath,
      comments: {
        raw: {},
        prepared: {}
      },
    };

    this.handleError = this.handleError.bind(this);
    this.onCommentFound = this.onCommentFound.bind(this);
    this.onBlameFound = this.onBlameFound.bind(this);
    this.renderComment = this.renderComment.bind(this);
    this.normalizeComment = this.normalizeComment.bind(this);
  }

  setStateComment(key, hash, comment) {
    this.setState(state => ({
      ...state,
      comments: {
        ...state.comments,
        [key]: {
          ...state.comments[key],
          [hash]: {
            ...(state.comments[key][hash] || {}),
            ...comment
          }
        }
      }
    }));
  }

  onBlameFound(rawHash, type, blame) {
    this.setStateComment('prepared', `${rawHash}${blame.hash}`, blame);
  }

  onCommentFound(comment) {
    let { file, line, text } = comment;
    text = text.replace(/\s*$/, '');

    const hash = encodeURI(`${file}${line}${text}`);
    this.setStateComment('raw', hash, comment);

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
    gitGrep(this.state.repoPath, { rev: 'HEAD', term: '((TODO)|(FIXME)|(TESTME)|(DOCME))' })
      .on('data', this.onCommentFound)
      .on('error', this.handleError)
      .on('end', () => null);
  }

  componentDidMount() {
    this.loadComments();
  }

  normalizeComment(content) {
    return (content || '')
      .replace(/^\s+/, '')
      // Spaces at the beginning
      .replace(/\s+$/, '')
      // Comments of type //
      .replace(/^\/\/\s*/, '')
      // Comments of type #
      .replace(/^#\s*/, '')
      // Comments of type /*
      .replace(/^\/*\s*/, '')
      .replace(/\s*\*\}\s*$/, '')
      // Comments of type {/*
      .replace(/^\{\s*\/\*\s*/, '')
      .replace(/\*\/\s*\}\s*$/, '');
  }

  renderComment(hash) {
    const comment = this.state.comments.prepared[hash];
    const author = comment.author || {};

    return (
      <Box key={hash} green>
        <Box width={20} marginRight={1} textWrap="truncate">
          <Color yellow>{author.name || ''}</Color>
        </Box>
        <Box flexGrow={1}>
          {this.normalizeComment(comment.content)}
        </Box>
      </Box>
    )
  }

  renderLoading() {
    return (
      <React.Fragment>
        <Color yellow>{Object.keys(this.state.comments.raw).length} comments found</Color>
        {<Color green>Loading ...</Color>}
      </React.Fragment>
    );
  }

  render() {
    const rawComments = this.state.comments.raw;
    const preparedComments = this.state.comments.prepared;
    const commentsLoaded = Object.keys(rawComments).length === Object.keys(preparedComments).length;

    if (!commentsLoaded) {
      return this.renderLoading();
    }

    return (
      <Static>{Object.keys(preparedComments).map(this.renderComment)}</Static>
    );
  }
}

render(<Finder/>);
