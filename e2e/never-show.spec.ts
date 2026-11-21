import { expect, test } from "@playwright/test";
import { neverShowItemsIn } from "../src/never-show.ts";

for (const path of ["./", "./plain/"]) {
  test(`the built page at ${path} contains none of the never-show items`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(200);

    expect(neverShowItemsIn(await response.text())).toEqual([]);
  });
}
