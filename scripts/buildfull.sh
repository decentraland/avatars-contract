#! /bin/bash

AVATARS=Avatars.sol

OUTPUT=full

npx truffle-flattener contracts/$AVATARS > $OUTPUT/$AVATARS