#!/usr/bin/env bash
set -euo pipefail

# launches a Jupyter notebook with all the dependencies installed in the uvx environment.

deps=(
	--with Pillow
	--with litellm
	--with loky
	--with transformers
	--with datasets
	--with nltk
	--with spacy
	--with "https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl"
	--with pandas
	--with torch
	--with tqdm
	--with jupyter-core
    --with accelerate
)

# xformers often requires OpenMP when building from source.
# Apple clang does not support -fopenmp out of the box, so skip on macOS by default.
if [[ "${OSTYPE:-}" == darwin* ]]; then
	if [[ "${INCLUDE_XFORMERS_ON_MAC:-0}" == "1" ]]; then
		deps+=(--with xformers)
	else
		echo "Skipping xformers on macOS (set INCLUDE_XFORMERS_ON_MAC=1 to force)."
	fi
else
	deps+=(--with xformers)
fi

exec uvx "${deps[@]}" --from "jupyter[all]" jupyter notebook "$@"