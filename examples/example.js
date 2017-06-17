const myers = require('../dist').default;

const lhs = 'the quick red fox jumped\nover the hairy dog';
const rhs = 'the quick brown fox jumped\nover the lazy dog';
const diff = myers.diff(lhs, rhs, {});

console.log(myers.formats.GnuNormalFormat(diff));
