require("@testing-library/jest-dom");
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");
const fetchStats = require("../src/fetchers/stats-fetcher");
const calculateRank = require("../src/calculateRank");

const data = {
  data: {
    user: {
      name: "Anurag Hazra",
      repositoriesContributedTo: { totalCount: 61 },
      contributionsCollection: {
        totalCommitContributions: 100,
        restrictedContributionsCount: 50,
      },
      pullRequests: { totalCount: 300 },
      issues: { totalCount: 200 },
      followers: { totalCount: 100 },
      repositories: {
        totalCount: 5,
        nodes: [
          { stargazers: { totalCount: 100 } },
          { stargazers: { totalCount: 100 } },
          { stargazers: { totalCount: 100 } },
          { stargazers: { totalCount: 50 } },
          { stargazers: { totalCount: 50 } },
        ],
      },
    },
  },
};

const error = {
  errors: [
    {
      type: "NOT_FOUND",
      path: ["user"],
      locations: [],
      message: "Could not resolve to a User with the login of 'noname'.",
    },
  ],
};

const mock = new MockAdapter(axios);

afterEach(() => {
  mock.reset();
});

describe("Test fetchStats", () => {
  it("should fetch correct stats", async () => {
    mock.onPost("https://api.github.com/graphql").reply(200, data);

    let stats = await fetchStats("anuraghazra");
    const rank = calculateRank({
      totalCommits: 100,
      totalRepos: 5,
      followers: 100,
      contributions: 61,
      stargazers: 400,
      prs: 300,
      issues: 200,
    });

    expect(stats).toStrictEqual({
      contributedTo: 61,
      name: "Anurag Hazra",
      totalCommits: 100,
      totalIssues: 200,
      totalPRs: 300,
      totalStars: 400,
      rank,
    });
  });

  it("should throw error", async () => {
    mock.onPost("https://api.github.com/graphql").reply(200, error);

    await expect(fetchStats("anuraghazra")).rejects.toThrow(
      "Could not resolve to a User with the login of 'noname'."
    );
  });

  it("should fetch and add private contributions", async () => {
    mock.onPost("https://api.github.com/graphql").reply(200, data);

    let stats = await fetchStats("anuraghazra", true);
    const rank = calculateRank({
      totalCommits: 150,
      totalRepos: 5,
      followers: 100,
      contributions: 61,
      stargazers: 400,
      prs: 300,
      issues: 200,
    });

    expect(stats).toStrictEqual({
      contributedTo: 61,
      name: "Anurag Hazra",
      totalCommits: 150,
      totalIssues: 200,
      totalPRs: 300,
      totalStars: 400,
      rank,
    });
  });

  it("should fetch total commits", async () => {
    mock.onPost("https://api.github.com/graphql").reply(200, data);
    mock
      .onGet("https://api.github.com/search/commits?q=author:anuraghazra")
      .reply(200, { total_count: 1000 });

    let stats = await fetchStats("anuraghazra", true, true);
    const rank = calculateRank({
      totalCommits: 1000 + 150,
      totalRepos: 5,
      followers: 100,
      contributions: 61,
      stargazers: 400,
      prs: 300,
      issues: 200,
    });

    expect(stats).toStrictEqual({
      contributedTo: 61,
      name: "Anurag Hazra",
      totalCommits: 1000 + 150,
      totalIssues: 200,
      totalPRs: 300,
      totalStars: 400,
      rank,
    });
  });

  it("should fetch contributions from a given date", async () => {
    const dataFromDate = {
      data: {
        user: {
          name: "John Doe",
          contributionsCollection: {
            totalCommitContributions: 16,
            restrictedContributionsCount: 0,
            totalIssueContributions: 1,
            totalPullRequestContributions: 3,
            totalRepositoryContributions: 6,
          },
          repositoriesContributedTo: {
            totalCount: 3
          },
          pullRequests: { totalCount: 4 },
          issues: { totalCount: 2 },
          followers: { totalCount: 0 },
          repositories: {
            totalCount: 1,
            nodes: [
              { stargazers: { totalCount: 1 } },
            ],
          },
        },
      },
    };

    mock.onPost("https://api.github.com/graphql").reply(200, dataFromDate);

    let stats = await fetchStats("johndoe", false, false, "2020-09-01T00:00:00.000Z");
    const rank = calculateRank({
      totalCommits: 16,
      totalRepos: 6,
      followers: 0,
      contributions: 16,
      stargazers: 1,
      prs: 3,
      issues: 1,
    });

    expect(stats).toStrictEqual({
      contributedTo: 6,
      name: "John Doe",
      totalCommits: 16,
      totalIssues: 1,
      totalPRs: 3,
      totalStars: 1,
      rank,
    });
  });
});
