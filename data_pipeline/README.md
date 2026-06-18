# Data Pipeline

This folder contains the scripts for (re)generating data for this project. 

## Main Pipeline

 - Generate Cards - fetches real article data, sorts by views, splits into sentences, fetches topics, fetches image attribution information
 - Filter Eval - applies the filtering model to the real generated cards 
 - Generate Fakes - uses a model to create convincing fake articles
 - Find Fake Images - finds suitable images for the fakes and grabs the attribution information
 - Make Dump - formats real and fake cards into the correct database friendly format

## Auxiliary Stuff

Filter Training - code for training the filtering model


## Running the pipeline

Launch the notebook server with launch_jupyer.sh

You will need to do some setup. This includes
 - pageviews dumps (from https://dumps.wikimedia.org/other/pageview_complete/monthly)
 - the filtering model (from https://huggingface.co/derenrich/wiki-modernbert-sensitive-classifier/settings)
 - ollama will need to have some models for Find Fake Images
 - you will need to set a gemini api key for generating fakes
