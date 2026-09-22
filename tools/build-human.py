"""Extract CC0 MakeHuman head/hand topology and apply native male/child morphs.
Inputs: base.obj, asian-male-young.target, asian-male-child.target (see assets/NOTICE.md).
Usage: python3 tools/build-human.py BASE MALE CHILD
Only rendered head/hands are included in the shipped data, never hidden body helpers.
"""
import json,sys,math
from pathlib import Path
base,male,child=sys.argv[1:]
v=[];uv=[];faces=[];joints={};group=''
for line in open(base):
 p=line.split()
 if not p:continue
 if p[0]=='v':v.append(list(map(float,p[1:4])))
 elif p[0]=='vt':uv.append(list(map(float,p[1:3])))
 elif p[0]=='g':group=p[1]
 elif p[0]=='f':
  face=[tuple(int(i)-1 for i in x.split('/')[:2]) for x in p[1:]]
  if group=='body':faces.append(face)
  if group.startswith('joint-'):joints.setdefault(group,set()).update(x[0] for x in face)
def build(target,is_child):
 points=[p[:] for p in v]
 for line in open(target):
  p=line.split()
  if not p or p[0].startswith('#'):continue
  idx=int(p[0]);points[idx]=[points[idx][k]+float(p[k+1]) for k in range(3)]
 bodyids=set(x[0] for f in faces for x in f)
 ground=min(points[i][1] for i in bodyids);top=max(points[i][1] for i in bodyids);scale=1.82/(top-ground)
 def vec(p):return [round(p[0]*scale,6),round((p[1]-ground)*scale,6),round(p[2]*scale,6)]
 points=list(map(vec,points))
 centers={name:[sum(points[i][k] for i in ids)/len(ids) for k in range(3)] for name,ids in joints.items()}
 neck=centers['joint-neck'];wrist=centers['joint-l-hand'];elbow=centers['joint-l-elbow']
 def extract(test,origin):
  pos=[];tex=[];idx=[];lookup={}
  for f in faces:
   if not test([points[x[0]] for x in f]):continue
   ids=[]
   for key in f:
    if key not in lookup:
     lookup[key]=len(pos)//3
     pos.extend(round(points[key[0]][k]-origin[k],6) for k in range(3));tex.extend(uv[key[1]])
    ids.append(lookup[key])
   for i in range(1,len(ids)-1):idx.extend([ids[0],ids[i],ids[i+1]])
  return dict(position=pos,uv=tex,index=idx)
 head=extract(lambda pts:min(p[1] for p in pts)>neck[1]-.028,neck)
 hand=extract(lambda pts:min(p[0] for p in pts)>wrist[0]-.012,wrist)
 out={'head':head,'hand':hand,'neck':neck,'eyeL':[centers['joint-l-eye'][i]-neck[i] for i in range(3)],'eyeR':[centers['joint-r-eye'][i]-neck[i] for i in range(3)],'headTop':max(head['position'][1::3])}
 print('child' if is_child else 'adult','neck',neck,'head height',out['headTop'],'eyes',out['eyeL'],'vertices',len(head['position'])//3)
 return out
out={'adult':build(male,False),'child':build(child,True)}
Path('assets/characters/human.js').write_text('/* Derived from MakeHuman CC0 core assets; see assets/NOTICE.md. */\nconst HUMAN_ASSET='+json.dumps(out,separators=(',',':'))+';\n')
