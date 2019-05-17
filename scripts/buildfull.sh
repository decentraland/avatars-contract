#! /bin/bash

AVATARS=AvatarNameRegistry.sol

OUTPUT=full

npx truffle-flattener contracts/$AVATARS > $OUTPUT/$AVATARS