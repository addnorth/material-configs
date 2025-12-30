/**
 * Generates changelog from git commits and updates CHANGELOG.md
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
 * Parse conventional commit message
 */
function parseCommit(commit: string): {
  type: string;
  scope?: string;
  message: string;
  breaking: boolean;
} {
  const breakingMatch = commit.match(/^(\w+)(?:\(([^)]+)\))?!: (.+)$/);
  if (breakingMatch) {
    return {
      type: breakingMatch[1],
      scope: breakingMatch[2],
      message: breakingMatch[3],
      breaking: true,
    };
  }

  const match = commit.match(/^(\w+)(?:\(([^)]+)\))?: (.+)$/);
  if (match) {
    return {
      type: match[1],
      scope: match[2],
      message: match[3],
      breaking: false,
    };
  }

  return {
    type: "other",
    message: commit,
    breaking: false,
  };
}

/**
 * Group commits by type
 */
function groupCommitsByType(commits: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {
    feat: [],
    fix: [],
    docs: [],
    style: [],
    refactor: [],
    perf: [],
    test: [],
    chore: [],
    breaking: [],
    other: [],
  };

  for (const commit of commits) {
    const parsed = parseCommit(commit);
    if (parsed.breaking) {
      groups.breaking.push(commit);
    } else if (groups[parsed.type]) {
      groups[parsed.type].push(commit);
    } else {
      groups.other.push(commit);
    }
  }

  return groups;
}

/**
 * Generate changelog markdown
 */
export function generateChangelogMarkdown(
  version: string,
  commits: string[],
  options: ChangelogOptions = {}
): string {
  const groups = groupCommitsByType(commits);
  const lines: string[] = [];

  lines.push(`## [${version}]`);
  lines.push("");

  const typeLabels: Record<string, string> = {
    feat: "### Added",
    fix: "### Fixed",
    docs: "### Documentation",
    breaking: "### Breaking Changes",
    other: "### Other",
  };

  // Add breaking changes first
  if (groups.breaking.length > 0) {
    lines.push(typeLabels.breaking);
    for (const commit of groups.breaking) {
      const parsed = parseCommit(commit);
      lines.push(`- ${parsed.message}`);
    }
    lines.push("");
  }

  // Add other types
  for (const [type, typeCommits] of Object.entries(groups)) {
    if (type === "breaking" || typeCommits.length === 0) continue;

    if (typeLabels[type]) {
      lines.push(typeLabels[type]);
      for (const commit of typeCommits) {
        const parsed = parseCommit(commit);
        lines.push(`- ${parsed.message}`);
      }
      lines.push("");
    } else if (type === "other" && typeCommits.length > 0) {
      lines.push(typeLabels.other);
      for (const commit of typeCommits) {
        lines.push(`- ${commit}`);
      }
      lines.push("");
    }
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
    // Get the latest tag
    const tags = getGitTags();
    if (tags.length > 0) {
      from = tags[0];
    }
    to = "HEAD";
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
