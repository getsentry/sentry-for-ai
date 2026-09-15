console.log(`TTY: ${process.stdin.isTTY}/${process.stdout.isTTY}/${process.stderr.isTTY}`);
console.log(`ARG: ${process.argv[2]}`);
const url = "https://example.com/authorize?token=test";
console.log(`\x1b]8;;${url}\x07${url}\x1b]8;;\x07`);
process.on("SIGINT", () => {
  console.log("CANCELLED");
  process.exit(130);
});
process.stdin.resume();
console.log("READY");
