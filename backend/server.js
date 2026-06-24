const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

function buildTree(node, graph) {
    const result = {};

    if (!graph[node]) {
        return result;
    }

    for (let child of graph[node]) {
        result[child] = buildTree(child, graph);
    }

    return result;
}

function calculateDepth(node, graph) {
    if (!graph[node] || graph[node].length === 0) {
        return 1;
    }

    let maxDepth = 0;

    for (let child of graph[node]) {
        maxDepth = Math.max(maxDepth, calculateDepth(child, graph));
    }

    return maxDepth + 1;
}

function detectCycle(node, graph, visited, recStack) {
    visited.add(node);
    recStack.add(node);

    if (graph[node]) {
        for (let child of graph[node]) {
            if (!visited.has(child)) {
                if (
                    detectCycle(
                        child,
                        graph,
                        visited,
                        recStack
                    )
                ) {
                    return true;
                }
            } else if (recStack.has(child)) {
                return true;
            }
        }
    }

    recStack.delete(node);

    return false;
}

app.post("/bfhl", (req, res) => {
    const { data } = req.body;

    const invalid_entries = [];
    const duplicate_edges = [];

    const seenEdges = new Set();

    const graph = {};
    const childParent = {};
    const allNodes = new Set();

    for (let entry of data) {
        entry = entry.trim();

        const regex = /^[A-Z]->[A-Z]$/;

        if (!regex.test(entry)) {
            invalid_entries.push(entry);
            continue;
        }

        const [parent, child] = entry.split("->");

        if (parent === child) {
            invalid_entries.push(entry);
            continue;
        }

        if (seenEdges.has(entry)) {
            if (!duplicate_edges.includes(entry)) {
                duplicate_edges.push(entry);
            }
            continue;
        }

        seenEdges.add(entry);

        if (childParent[child]) {
            continue;
        }

        childParent[child] = parent;

        if (!graph[parent]) {
            graph[parent] = [];
        }

        graph[parent].push(child);

        allNodes.add(parent);
        allNodes.add(child);
    }

    const roots = [];

    for (let node of allNodes) {
        if (!childParent[node]) {
            roots.push(node);
        }
    }

    const hierarchies = [];

    let total_trees = 0;
    let total_cycles = 0;

    let largestDepth = 0;
    let largest_tree_root = "";

    const visitedGlobal = new Set();

    for (let root of roots.sort()) {
        const visited = new Set();
        const recStack = new Set();

        const hasCycle = detectCycle(
            root,
            graph,
            visited,
            recStack
        );

        if (hasCycle) {
            total_cycles++;

            hierarchies.push({
                root,
                tree: {},
                has_cycle: true
            });

            continue;
        }

        const treeObj = {
            [root]: buildTree(root, graph)
        };

        const depth = calculateDepth(root, graph);

        total_trees++;

        if (
            depth > largestDepth ||
            (
                depth === largestDepth &&
                root < largest_tree_root
            )
        ) {
            largestDepth = depth;
            largest_tree_root = root;
        }

        hierarchies.push({
            root,
            tree: treeObj,
            depth
        });
    }

    const visited = new Set();

    for (let node of allNodes) {
        if (!visited.has(node)) {
            const rec = new Set();

            if (
                detectCycle(
                    node,
                    graph,
                    visited,
                    rec
                )
            ) {
                const root = [...allNodes]
                    .filter(n => !roots.includes(n))
                    .sort()[0];

                total_cycles++;

                hierarchies.push({
                    root,
                    tree: {},
                    has_cycle: true
                });

                break;
            }
        }
    }

    res.json({
        user_id:
            process.env.USER_ID,

        email_id:
            process.env.EMAIL_ID,

        college_roll_number:
            process.env.ROLL_NO,

        hierarchies,

        invalid_entries,

        duplicate_edges,

        summary: {
            total_trees,
            total_cycles,
            largest_tree_root
        }
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(
        `Server Running On ${PORT}`
    );
});