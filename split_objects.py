"""
Usage:
  spit_objects.py <filename> [--output-dir=<d>]

Options:
    --output-dir=<d>    Output file location [default: obj_objects]
"""

from docopt import docopt
from os import path

args = docopt(__doc__, version='0.1')

def shift_indices(line, numbers):
    parts = line.split()
    result = [parts[0]]
    
    for part in parts[1:]:
        bits = part.split('/')
        bits = [int(bit) if bit != '' else 0 for bit in bits]

        result.append('/'.join([str(bits[0] - numbers['v']),
                                '', #str(bits[1] - numbers['t']),
                                str(bits[2] - numbers['vn'])]))

    return ' '.join(result) + '\n'


def save_file(path):

    with open(path, 'w') as wf:
        for wline in line_buffer:
            if (wline.startswith('f')):
                wline = shift_indices(wline, numbers)
            wf.write(wline)

def make_path(args, name):
    return path.join(args['--output-dir'], name + '.obj')
            
with open(args['<filename>']) as f:
    output_filename = None
    line_buffer = []
    numbers = { 'v': 0, 'vn': 0, 't': 0 }
    
    for line in f:
        if line.startswith('o'):

            if output_filename:
                file_path = make_path(args, output_filename)
                save_file(file_path)
                
                numbers['v']+= len([1 for l in line_buffer if l.startswith('v ')])
                numbers['vn']+= len([1 for l in line_buffer if l.startswith('vn')])
                line_buffer = []

            o, name = line.split(' ')
            output_filename = name.strip()
            
        else:
            line_buffer.append(line)
            

    if output_filename:
        file_path = make_path(args, output_filename)
        save_file(file_path)
        
