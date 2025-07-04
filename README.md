# TPMAgent: Technical Program Manager Simulation with LLM Flows

## Overview

TPMAgent is a project that leverages Large Language Model (LLM) flows and targeted prompts to simulate the behavior of a Technical Program Manager (TPM). The goal is to automate the process of creating project plans, implementation strategies, and bootstrap code for specific technical problems, enabling rapid prototyping and structured project initiation.

## Problem Space

In many organizations, TPMs play a critical role in bridging the gap between business requirements and technical execution. They are responsible for:
- Defining project scope and deliverables
- Creating detailed implementation strategies
- Coordinating between stakeholders
- Generating initial technical documentation and code scaffolding

However, this process is often manual, time-consuming, and dependent on individual expertise. There is a need for tools that can:
- Accelerate the planning and bootstrapping phase
- Ensure consistency and best practices
- Reduce the cognitive load on TPMs and engineering leads

## Project Scope

TPMAgent aims to:
1. **Simulate TPM Reasoning:** Use LLMs to analyze a targeted problem and generate a comprehensive project plan, including milestones, risks, and dependencies.
2. **Implementation Strategy Generation:** Automatically produce a step-by-step implementation strategy tailored to the problem domain and technology stack.
3. **Bootstrap Code Creation:** Generate initial code scaffolding and documentation to kickstart development, following industry best practices.
4. **Prompt Engineering:** Develop targeted prompts and LLM flows that guide the model to produce high-quality, actionable outputs.

## Key Features

- Modular LLM flow design for extensibility
- Customizable prompt templates for different project types
- Integration with code generation and documentation tools
- Output formats suitable for direct use by engineering teams

## Example Use Cases

- Bootstrapping a new web application with a defined tech stack
- Generating a migration plan for legacy systems
- Creating a technical roadmap for feature development

## Getting Started

### Folder structure

- `prompts`: contains the seed prompts and corresponding results to create the initial project. You can see the resulting issues in the [associated GitHub project](https://github.com/orgs/MSWorkStuff/projects/1)

- `project_src`: contains just applying the prompts provided blindly with minimal research. This folder is just there to preserve history and serve as a warning on how to **not** use this project.

- `tpm-agent`: is a more conscientious attempt at implementing this. This contains a next.js app that so far:
  - Allows users to use GitHub login
  - Tests connection to [GitHub officially hosted MCP server](https://github.com/github/github-mcp-server)
  - Has a skeleton chat window that preserves history