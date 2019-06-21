# git-pending
> Git plugin to list todo, fixme, testme and docme comments with verbose details

![](./.github/1.png)

## Installation

Run the command below to install the plugin

```javascript
npm install -g git-pending
```

## Usage

Open any git repository and run below command

```bash
git pending
```
This will list all the pending `TODO`, `FIXME`, `TESTME` and `DOCME` comments

## Options
Here is the list of options that you can pass to modify the output of `git pending`

```bash
git pending [--oneline|-o ]
            [--type|-t <fixme|testme|docme|todo>]
            [--author|-a <author>]
            [--no-stats]
```

![](./.github/2.png)

## Examples

Here is the list of sample usage examples

### Comments by Single Author

> If you don't pass `--author` flag, it will show you the comments from everyone

```bash
git pending --author kamran --oneline
```
![](./.github/git-pending-oneline.gif)

### Comments with Commit Details

> Not passing `--oneline` flag will give you the detailed output with commit that introduced the comment

```bash
git pending --author kamran
```
![](./.github/git-pending-multi.gif)

### Comments of Specific Type

> Use `--type` flag to specify the type of comments you need. Possible values (`TODO`, `FIXME`, `TESTME`, `DOCME`)

```bash
git pending --type TODO
git pending --type TESTME
git pending --type FIXME
git pending --type DOCME
```
![](./.github/git-pending-type.gif)

### More Examples

```bash
# List all the TODO, FIXME, DOCME or TESTME comments
git pending

# List comments without stats
git pending --no-stats

# Lists the comments with only date
git pending --oneline

# Lists only the fixme comments
git pending --type fixme

# Lists the comments from specific author
git pending --author kamran

# Lists the specific type of comments from specific author
git pending --type fixme --author kamran 

# Provide options in short form
git pending -t fixme -a kamran -o
```

## License
MIT &copy; [Kamran Ahmed](https://twitter.com/kamranahmedse)
