from typing import Dict
import pyarrow as pa
import csv
from multiprocessing import Pool
from loky import get_reusable_executor
from datasets import load_dataset_builder
from datasets import Dataset
from datasets import load_dataset
from datasets import Features, Value
import json

import requests

import bz2
from collections import Counter
from tqdm.notebook import tqdm
import os
import re
import pickle


_views = None

def init_worker(v):
    global _views
    _views = v

def process_row(r: Dict[str, any]):
    try:
        abstract = r.get('abstract', "") or ""
        abstract = abstract.replace("\n"," ")
        entity = r.get('main_entity', "") or ""
        qid = entity.get('identifier') if entity else ""
        name = r.get('name', "") or ""
        view_count = (_views or {}).get(name.replace(" ", "_"), 0)
        description = r.get('description', "")
        image = r.get('image')
        image_url = ""
        if image:
            image_url = image.get('content_url', "")
    
        url = r.get('url', '')
        return dict(url=url, abstract=abstract, name=name, qid=qid, description=description, view_count=view_count, image_url=image_url)
    except Exception as e:
        print("foop", e)
        return {"error": str(e), "name": r.get("name", "")}
