# Releasing

This project uses [changesets](https://github.com/changesets/changesets) which
helps to keep package versions in sync on each release.

To release a new set of packages (with synced versions), run `version.sh` which
will automatically bump versions of all packages and generate `CHANGELOG.md` for
each package.
