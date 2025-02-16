import { rollup } from "npm:rollup";
import { minify } from "npm:terser";

let bundle = await rollup({
  input: "mod.js",
});

// Write legacy UMD files to tinycolor.js and dist/tinycolor-min.js.
// It'd be nice to get rid of these, if we could ensure they aren't used.
async function write_cdn_umd() {
  let { output } = await bundle.generate({
    format: "umd",
    name: "tinycolor",
  });
  let minified = await minify(output[0].code);
  const preamble = `// This file is autogenerated.
// It's here at this path for backwards compatibility for links to it
// but the npm package now exports both CJS and ESM.
// See https://github.com/bgrins/TinyColor/ for instructions.
  `;
  Deno.writeTextFileSync("npm/tinycolor.js", preamble + output[0].code);
  Deno.writeTextFileSync("npm/dist/tinycolor-min.js", preamble + minified.code);

  // Keeping these (without preamble) until we can confirm they aren't used by CDNs
  // after moving to the npm/ path. At that point these files can be removed in
  // https://github.com/bgrins/TinyColor/issues/260.
  Deno.writeTextFileSync("tinycolor.js", output[0].code);
  Deno.writeTextFileSync("dist/tinycolor-min.js", minified.code);
}

// Write necessary files for testing & publishing commonjs to npm.
// The subdirectory sets { "type": "commonjs" } in the package.json,
// and includes a lightweight test runner to ensure it works like mod.js.
async function write_npm_cjs() {
  let { output } = await bundle.generate({
    format: "umd",
    name: "tinycolor",
  });

  Deno.writeTextFileSync(
    "./npm/cjs/tinycolor.js",
    `// This file is autogenerated. It's used to publish CJS to npm.
` + output[0].code
  );
  const test_template = Deno.readTextFileSync("./npm/cjs/test_template.js");
  const test_content = Deno.readTextFileSync("test.js");
  Deno.writeTextFileSync(
    "./npm/cjs/test.js",
    test_template.replace(
      "// CONTENT_GOES_HERE",
      test_content.substring(
        test_content.indexOf("// TEST_BEGINS_HERE"),
        test_content.length - 1
      )
    )
  );
}

// Write necessary files for testing & publishing esm to npm.
// The subdirectory sets { "type": "module" } in the package.json,
// and includes a lightweight test runner to ensure it works like mod.js.
async function write_npm_esm() {
  let { output } = await bundle.generate({
    format: "esm",
  });

  Deno.writeTextFileSync(
    "./npm/esm/tinycolor.js",
    `// This file is autogenerated. It's used to publish ESM to npm.
` + output[0].code
  );
  const test_template = Deno.readTextFileSync("./npm/esm/test_template.js");
  const test_content = Deno.readTextFileSync("test.js");
  Deno.writeTextFileSync(
    "./npm/esm/test.js",
    test_template.replace(
      "// CONTENT_GOES_HERE",
      test_content.substring(
        test_content.indexOf("// TEST_BEGINS_HERE"),
        test_content.length - 1
      )
    )
  );
}

await write_cdn_umd();
await write_npm_cjs();
await write_npm_esm();

await Deno.copyFile("README.md", "npm/README.md");
await Deno.copyFile("LICENSE", "npm/LICENSE");
