import numpy as np

def grade_rgb(array,profile):
    rgb=array.astype(np.float32)/255
    corrected=np.power(rgb,profile['gamma']);corrected=(corrected-profile.get('pivot',.42))*profile['contrast']+profile.get('pivot',.42)
    corrected*=np.array(profile['rgbGain'],dtype=np.float32)
    luma=corrected[:,:,0]*.2126+corrected[:,:,1]*.7152+corrected[:,:,2]*.0722
    corrected=luma[:,:,None]+(corrected-luma[:,:,None])*profile['saturation']
    if profile.get('face'):
        face=profile['face'];y,x=np.ogrid[:array.shape[0],:array.shape[1]]
        radius=((x-face['center'][0])/face['radius'][0])**2+((y-face['center'][1])/face['radius'][1])**2
        feather=np.exp(-1.5*radius).astype(np.float32)
        shadow=np.clip((luma-face['shadowLow'])/(face['shadowHigh']-face['shadowLow']),0,1);shadow=1-shadow*shadow*(3-2*shadow)
        corrected*=np.exp2(face['exposureStops']*feather*shadow)[:,:,None]
    if profile.get('highlightShoulder'):
        shoulder=profile['highlightShoulder'];knee=shoulder['knee'];strength=shoulder['strength']
        if not (0 < knee < 1 and 0 <= strength < .5):
            raise ValueError('Highlight shoulder requires 0<knee<1 and 0<=strength<.5')
        # One luminance ratio preserves RGB proportions; no channel-wise hue shift.
        light=corrected[:,:,0]*.2126+corrected[:,:,1]*.7152+corrected[:,:,2]*.0722
        compressed=light-strength*np.maximum(light-knee,0)**2/(1-knee)
        corrected*=np.divide(compressed,light,out=np.ones_like(light),where=light>0)[:,:,None]
    return np.round(np.clip(corrected,0,1)*255).astype('uint8')
