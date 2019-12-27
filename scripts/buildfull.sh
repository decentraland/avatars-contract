#! /bin/bash

AVATARS=AvatarNameRegistry.sol
ENSSUBDOMAIN=SubdomainENSRegistry.sol

OUTPUT=full

npx truffle-flattener contracts/oldNameRegistry/$AVATARS > $OUTPUT/$AVATARS &&
npx truffle-flattener contracts/ens/$ENSSUBDOMAIN > $OUTPUT/$ENSSUBDOMAIN