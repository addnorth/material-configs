/**
 * Generates changelog from git commits
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// When compiled, files are in dist/build/, so go up two levels to reach project root
const rootDir = path.resolve(__dirname, "../..");

export interface ChangelogOptions {
  version?: string;
  fromTag?: string;
  toTag?: string;
  format?: "markdown" | "plain";
}

/**
 * Get git tags sorted by version
 */
function getGitTags(): string[] {
  try {
    const tags = execSync("git tag --sort=-version:refname", {
      encoding: "utf-8",
      cwd: rootDir,
    })
      .trim()
      .split("\n")
      .filter((tag) => tag.length > 0);
    return tags;
  } catch (error) {
    return [];
  }
}

/**
 * Get commits between two tags (or since a tag)
 */
function getCommitsBetween(fromTag: string | null, toTag: string | null): string[] {
  try {
    let command = "git log --pretty=format:%s";

    if (fromTag && toTag) {
      command += ` ${fromTag}..${toTag}`;
    } else if (fromTag) {
      command += ` ${fromTag}..HEAD`;
    } else if (toTag) {
      command += ` ${toTag}`;
    }

    const commits = execSync(command, {
      encoding: "utf-8",
      cwd: rootDir,
    })
      .trim()
      .split("\n")
      .filter((commit) => commit.length > 0);

    return commits;
  } catch (error: any) {
    console.warn(`Failed to get commits: ${error.message}`);
    return [];
  }
}

/**
 * Generate changelog markdown - simple list format
 */
export function generateChangelogMarkdown(
  version: string,
  commits: string[],
  options: ChangelogOptions = {}
): string {
  const lines: string[] = [];

  for (const commit of commits) {
    lines.push(`- ${commit}`);
  }

  return lines.join("\n");
}

/**
 * Generate changelog from git commits
 */
export async function generateChangelog(
  options: ChangelogOptions = {}
): Promise<string> {
  const { version, fromTag, toTag } = options;

  // Determine tags
  let from: string | null = fromTag || null;
  let to: string | null = toTag || null;

  if (!from && !to) {
    // Get all tags sorted by version (newest first)
    const tags = getGitTags();

    if (version) {
      // If we have a version, find the current tag and previous tag
      const currentTag = tags.find((tag) => {
        const tagVersion = tag.replace(/^v/, "");
        return tagVersion === version;
      });

      if (currentTag) {
        const currentTagIndex = tags.indexOf(currentTag);
        if (currentTagIndex < tags.length - 1) {
          // There's a previous tag - get commits between previous and current
          from = tags[currentTagIndex + 1];
          to = currentTag;
        } else {
          // This is the first tag or only tag - get all commits up to this tag
          to = currentTag;
        }
      } else {
        // Tag not found in list, get commits since latest tag
        if (tags.length > 0) {
          from = tags[0];
        }
        to = `v${version}`;
      }
    } else {
      // No version provided, get commits since latest tag
      if (tags.length > 0) {
        from = tags[0];
      }
      to = "HEAD";
    }
  }

  // Get commits
  const commits = getCommitsBetween(from, to);

  if (commits.length === 0) {
    return `## [${version || "Unreleased"}]\n\nNo changes.\n`;
  }

  // Generate markdown
  return generateChangelogMarkdown(version || "Unreleased", commits, options);
}

/**
 * Update CHANGELOG.md file
 */
export async function updateChangelogFile(
  version: string,
  changelog: string
): Promise<void> {
  const changelogPath = path.join(rootDir, "CHANGELOG.md");
  let existingContent = "";

  try {
    existingContent = await fs.readFile(changelogPath, "utf-8");
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  // Prepend new changelog entry
  const newContent = changelog + "\n" + existingContent;
  await fs.writeFile(changelogPath, newContent, "utf-8");
}

/**
 * Get version from git tag or package.json
 */
export async function getVersion(): Promise<string> {
  // Try to get version from git tag
  try {
    const tag = execSync("git describe --tags --exact-match HEAD", {
      encoding: "utf-8",
      cwd: rootDir,
    }).trim();

    // Remove 'v' prefix if present
    return tag.replace(/^v/, "");
  } catch (error) {
    // Fall back to package.json
    try {
      const packageJsonPath = path.join(rootDir, "package.json");
      const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(packageJsonContent);
      return packageJson.version || "1.0.0";
    } catch (error) {
      return "1.0.0";
    }
  }
}

/**
 * CLI entry point
 */
async function main() {
  try {
    const version = process.env.VERSION || (await getVersion());
    const changelog = await generateChangelog({ version });
    console.log(changelog);
  } catch (error: any) {
    console.error("Error generating changelog:", error.message);
    process.exit(1);
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${path.resolve(process.argv[1] || "")}`;
if (isMainModule) {
  main();
}
